import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all trainer attendance
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, start, end } = req.query;
    let query = 'SELECT * FROM trainer_attendance';
    let params = [];

    if (date) {
      query += ' WHERE date = ?';
      params.push(date);
    } else if (start && end) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(start, end);
    }

    query += ' ORDER BY date DESC, checkInTime DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get trainer attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark trainer attendance
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, trainerId, date, checkInTime, checkOutTime, status = 'present' } = req.body;

    if (!id || !trainerId || !date || !checkInTime) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if already marked for this date
    const [existing] = await pool.execute(
      'SELECT * FROM trainer_attendance WHERE trainerId = ? AND date = ?',
      [trainerId, date]
    );

    if (existing.length > 0) {
      // Record already exists — never overwrite checkInTime
      return res.status(409).json({ error: 'Already checked in today', existingId: existing[0].id });
    } else {
      // Insert new
      await pool.execute(
        'INSERT INTO trainer_attendance (id, trainerId, date, checkInTime, checkOutTime, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, trainerId, date, checkInTime, checkOutTime || null, status]
      );
      res.status(201).json({ message: 'Trainer attendance marked successfully', id });
    }
  } catch (error) {
    console.error('Mark trainer attendance error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Attendance already marked for this date' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Checkout — PATCH /trainer-attendance/:trainerId/checkout
router.patch('/:trainerId/checkout', authenticateToken, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [existing] = await pool.execute(
      'SELECT * FROM trainer_attendance WHERE trainerId = ? AND date = ?',
      [trainerId, today]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'No check-in found for today' });
    }

    if (existing[0].checkOutTime) {
      return res.status(400).json({ error: 'Already checked out', checkOutTime: existing[0].checkOutTime });
    }

    await pool.execute(
      'UPDATE trainer_attendance SET checkOutTime = ? WHERE trainerId = ? AND date = ?',
      [checkOutTime, trainerId, today]
    );

    res.json({ message: 'Checked out successfully', checkOutTime });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next trainer attendance ID
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM trainer_attendance ORDER BY id DESC LIMIT 1');
    
    let nextId = 'TAT001';
    if (rows.length > 0) {
      const lastId = rows[0].id;
      const num = parseInt(lastId.replace('TAT', '')) + 1;
      nextId = `TAT${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ id: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
