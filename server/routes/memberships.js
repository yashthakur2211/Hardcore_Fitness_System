import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all memberships
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, sync membership statuses based on current date
    await pool.execute(`
      UPDATE memberships 
      SET status = CASE 
        WHEN endDate < CURDATE() THEN 'expired'
        WHEN endDate >= CURDATE() AND pending = 0 THEN 'active'
        ELSE status
      END
    `);

    const [rows] = await pool.execute('SELECT * FROM memberships ORDER BY createdAt DESC');
    
    // Format dates to YYYY-MM-DD format and ensure numeric values
    const formatted = rows.map(row => ({
      ...row,
      startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
      endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
      totalFees: Number(row.totalFees || 0),
      paid: Number(row.paid || 0),
      pending: Number(row.pending || 0),
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Get memberships error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Generate next membership ID - MUST be before '/member/:memberId' to avoid route conflict
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM memberships ORDER BY id DESC LIMIT 1');
    
    let nextId = 'MS001';
    if (rows.length > 0) {
      const lastId = rows[0].id;
      const num = parseInt(lastId.replace('MS', '')) + 1;
      nextId = `MS${num.toString().padStart(3, '0')}`;
    }
    
    res.json({ id: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get memberships by member ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    // First, sync membership statuses for this member based on current date
    await pool.execute(`
      UPDATE memberships 
      SET status = CASE 
        WHEN endDate < CURDATE() THEN 'expired'
        WHEN endDate >= CURDATE() AND pending = 0 THEN 'active'
        ELSE status
      END
      WHERE memberId = ?
    `, [req.params.memberId]);

    // Explicitly select columns with aliases to ensure correct field mapping
    // Using column aliases to prevent any confusion
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        memberId, 
        startDate, 
        endDate, 
        duration, 
        status, 
        totalFees, 
        paid AS paid_amount, 
        pending AS pending_amount, 
        createdAt, 
        updatedAt 
       FROM memberships 
       WHERE memberId = ? 
       ORDER BY createdAt DESC`,
      [req.params.memberId]
    );
    
    // Format dates to YYYY-MM-DD format and ensure numeric values with correct field mapping
    const formatted = rows.map(row => {
      // Use the aliased column names
      const paidValue = Number(row.paid_amount || 0);
      const pendingValue = Number(row.pending_amount || 0);
      const totalFeesValue = Number(row.totalFees || 0);
      
      // Debug logging to verify values
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Membership ${row.id}] Raw DB values:`, {
          'row.paid_amount (from DB)': row.paid_amount,
          'row.pending_amount (from DB)': row.pending_amount,
          'row.totalFees': row.totalFees,
          'Processed paid': paidValue,
          'Processed pending': pendingValue,
          'Processed totalFees': totalFeesValue,
        });
      }
      
      return {
        id: row.id,
        memberId: row.memberId,
        startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
        endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
        duration: Number(row.duration || 0),
        status: row.status,
        totalFees: totalFeesValue,
        paid: paidValue,  // Amount already paid - should be higher if payments were made
        pending: pendingValue,  // Amount still due - should be lower if payments were made
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('Get memberships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create membership
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, memberId, startDate, endDate, duration, totalFees, paid = 0, pending, hasPersonalTrainer, assignedTrainerId } = req.body;

    if (!id || !memberId || !startDate || !endDate || !duration || totalFees === undefined) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Ensure dates are in YYYY-MM-DD format
    const formattedStartDate = startDate.includes('T') ? startDate.split('T')[0] : startDate;
    const formattedEndDate = endDate.includes('T') ? endDate.split('T')[0] : endDate;

    const status = new Date(formattedEndDate) >= new Date() ? 'active' : 'expired';

    await pool.execute(
      `INSERT INTO memberships (id, memberId, startDate, endDate, duration, status, totalFees, paid, pending) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, memberId, formattedStartDate, formattedEndDate, duration, status, totalFees, paid, pending || totalFees - paid]
    );

    // Update member status and PT information based on membership
    if (status === 'active') {
      // Build update query dynamically based on what needs to be updated
      let updateQuery = 'UPDATE members SET status = "active"';
      let updateParams = [];
      
      // Only update PT fields if they were explicitly provided
      if (typeof hasPersonalTrainer !== 'undefined') {
        updateQuery += ', hasPersonalTrainer = ?';
        updateParams.push(hasPersonalTrainer ? 1 : 0);
        
        if (hasPersonalTrainer && assignedTrainerId) {
          updateQuery += ', assignedTrainerId = ?';
          updateParams.push(assignedTrainerId);
        } else if (!hasPersonalTrainer) {
          // If no longer using PT, clear the trainer assignment
          updateQuery += ', assignedTrainerId = NULL';
        }
      }
      
      updateQuery += ' WHERE memberId = ?';
      updateParams.push(memberId);
      
      await pool.execute(updateQuery, updateParams);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Membership] Updated member status to active:', memberId, 'PT:', hasPersonalTrainer);
      }
    }

    res.status(201).json({ message: 'Membership created successfully', id });
  } catch (error) {
    console.error('Create membership error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update membership
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, duration, totalFees, paid, pending, status } = req.body;

    // Ensure dates are in YYYY-MM-DD format
    const formattedStartDate = startDate ? (startDate.includes('T') ? startDate.split('T')[0] : startDate) : null;
    const formattedEndDate = endDate ? (endDate.includes('T') ? endDate.split('T')[0] : endDate) : null;

    await pool.execute(
      `UPDATE memberships 
       SET startDate = ?, endDate = ?, duration = ?, totalFees = ?, paid = ?, pending = ?, status = ? 
       WHERE id = ?`,
      [formattedStartDate, formattedEndDate, duration, totalFees, paid, pending, status, req.params.id]
    );

    res.json({ message: 'Membership updated successfully' });
  } catch (error) {
    console.error('Update membership error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
