import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all attendance
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, start, end } = req.query;
    let query = 'SELECT * FROM attendance';
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
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance by member ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM attendance WHERE memberId = ? ORDER BY date DESC',
      [req.params.memberId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark attendance
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, memberId, date, status = 'present', checkInTime } = req.body;

    if (!id || !memberId || !date) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if already marked for this date
    const [existing] = await pool.execute(
      'SELECT * FROM attendance WHERE memberId = ? AND date = ?',
      [memberId, date]
    );

    if (existing.length > 0) {
      // Update existing
      await pool.execute(
        'UPDATE attendance SET status = ?, checkInTime = ? WHERE memberId = ? AND date = ?',
        [status, checkInTime || null, memberId, date]
      );
      res.json({ message: 'Attendance updated successfully', id: existing[0].id });
    } else {
      // Insert new
      await pool.execute(
        'INSERT INTO attendance (id, memberId, date, status, checkInTime) VALUES (?, ?, ?, ?, ?)',
        [id, memberId, date, status, checkInTime || null]
      );
      res.status(201).json({ message: 'Attendance marked successfully', id });
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Attendance already marked for this date' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next attendance ID
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM attendance ORDER BY id DESC LIMIT 1');
    
    let nextId = 'ATT001';
    if (rows.length > 0) {
      const lastId = rows[0].id;
      const num = parseInt(lastId.replace('ATT', '')) + 1;
      nextId = `ATT${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ id: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
