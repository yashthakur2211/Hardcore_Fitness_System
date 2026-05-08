import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all enquiries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM enquiries ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create enquiry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, name, phone, visitDate, notes, referralSource } = req.body;

    if (!id || !name || !phone || !visitDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    await pool.execute(
      'INSERT INTO enquiries (id, name, phone, visitDate, notes, referralSource) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, phone, visitDate, notes || null, referralSource || null]
    );

    res.status(201).json({ message: 'Enquiry created successfully', id });
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update enquiry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, visitDate, notes, referralSource } = req.body;

    await pool.execute(
      'UPDATE enquiries SET name = ?, phone = ?, visitDate = ?, notes = ?, referralSource = ? WHERE id = ?',
      [name, phone, visitDate, notes, referralSource, req.params.id]
    );

    res.json({ message: 'Enquiry updated successfully' });
  } catch (error) {
    console.error('Update enquiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete enquiry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM enquiries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error('Delete enquiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next enquiry ID
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM enquiries ORDER BY id DESC LIMIT 1');
    
    let nextId = 'ENQ001';
    if (rows.length > 0) {
      const lastId = rows[0].id;
      const num = parseInt(lastId.replace('ENQ', '')) + 1;
      nextId = `ENQ${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ id: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
