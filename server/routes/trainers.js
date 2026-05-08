import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all trainers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM trainers ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next trainer ID - MUST be before '/:id' to avoid route conflict
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT trainerId FROM trainers ORDER BY trainerId DESC LIMIT 1');
    
    let nextId = 'TR001';
    if (rows.length > 0) {
      const lastId = rows[0].trainerId;
      const num = parseInt(lastId.replace('TR', '')) + 1;
      nextId = `TR${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ trainerId: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single trainer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM trainers WHERE trainerId = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trainer not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Get trainer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create trainer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { trainerId, name, phone, specialization, isActive = true } = req.body;

    if (!trainerId || !name || !phone) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    await pool.execute(
      'INSERT INTO trainers (trainerId, name, phone, specialization, isActive) VALUES (?, ?, ?, ?, ?)',
      [trainerId, name, phone, specialization || null, isActive]
    );

    res.status(201).json({ message: 'Trainer created successfully', trainerId });
  } catch (error) {
    console.error('Create trainer error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Trainer ID already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update trainer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, specialization, isActive } = req.body;

    await pool.execute(
      'UPDATE trainers SET name = ?, phone = ?, specialization = ?, isActive = ? WHERE trainerId = ?',
      [name, phone, specialization, isActive, req.params.id]
    );

    res.json({ message: 'Trainer updated successfully' });
  } catch (error) {
    console.error('Update trainer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete trainer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM trainers WHERE trainerId = ?', [req.params.id]);
    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Delete trainer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
