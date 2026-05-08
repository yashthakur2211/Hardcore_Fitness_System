import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = express.Router();

// Runtime migrations for existing databases
(async () => {
  try {
    // Add phone column if missing
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'`
    );
    if (cols.length === 0) {
      await pool.execute('ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL');
    }
  } catch (e) {
    // Non-fatal
  }
  try {
    // Make email nullable so phone-only accounts can be created
    await pool.execute(
      `ALTER TABLE users MODIFY COLUMN email VARCHAR(100) DEFAULT NULL`
    );
  } catch (e) {
    // Non-fatal
  }
})();

// Public: check whether any admin / any user exists
router.get('/status', async (req, res) => {
  try {
    const [adminRows] = await pool.execute(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
    );
    const [userRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM users'
    );
    res.json({
      hasAdmin: adminRows[0].cnt > 0,
      hasUsers: userRows[0].cnt > 0,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login — accepts username, email, or phone
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email/phone and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?',
      [username, username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register — admin role allowed only when no admin exists yet
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // At least one of email or phone must be provided
    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    if (phone) {
      const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Determine allowed role
    let safeRole = role === 'admin' ? 'admin' : 'user';

    if (safeRole === 'admin') {
      const [adminRows] = await pool.execute(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'"
      );
      if (adminRows[0].cnt > 0) {
        return res.status(403).json({ error: 'An admin account already exists. Admin registration is not allowed.' });
      }
    }

    // Check for duplicate username / email / phone
    const conditions = ['username = ?'];
    const params = [username];

    if (email) {
      conditions.push('email = ?');
      params.push(email);
    }
    if (phone) {
      conditions.push('phone = ?');
      params.push(phone);
    }

    const [existing] = await pool.execute(
      `SELECT username, email, phone FROM users WHERE ${conditions.join(' OR ')}`,
      params
    );

    if (existing.length > 0) {
      const dup = existing[0];
      if (dup.username === username) return res.status(400).json({ error: 'Username already taken' });
      if (email && dup.email === email) return res.status(400).json({ error: 'Email already registered' });
      if (phone && dup.phone === phone) return res.status(400).json({ error: 'Phone number already registered' });
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [username, email || null, phone || null, hashedPassword, safeRole]
    );

    // On first admin creation, remove stale demo accounts
    if (safeRole === 'admin') {
      try {
        await pool.execute(
          `DELETE FROM users WHERE id != ? AND (
            username IN ('admin', 'user') OR
            email LIKE '%@gymmaster.com'
          )`,
          [result.insertId]
        );
      } catch (e) {
        // Non-fatal
      }
    }

    res.status(201).json({ message: 'Account created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.execute(
      'SELECT id, username, email, phone, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
