import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ensure receipts table exists on startup
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS receipts (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        receiptId     VARCHAR(20) UNIQUE NOT NULL,
        paymentId     VARCHAR(20) NOT NULL,
        memberId      VARCHAR(20) NOT NULL,
        memberName    VARCHAR(255),
        memberPhone   VARCHAR(20),
        memberPhoto   TEXT,
        duration      INT,
        startDate     DATE,
        endDate       DATE,
        totalFees     DECIMAL(10,2) DEFAULT 0,
        discount      DECIMAL(10,2) DEFAULT 0,
        paid          DECIMAL(10,2) DEFAULT 0,
        pending       DECIMAL(10,2) DEFAULT 0,
        paymentMode   VARCHAR(20),
        paymentDate   DATE,
        gymName       VARCHAR(255),
        isPendingFeePayment TINYINT(1) DEFAULT 0,
        createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('[Payments] Failed to ensure receipts table:', err.message);
  }
})();

// Get all payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM payments ORDER BY paymentDate DESC');
    res.json(rows);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all receipts
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM receipts ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipt by receiptId
router.get('/receipts/:receiptId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM receipts WHERE receiptId = ?',
      [req.params.receiptId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Receipt not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next payment ID - MUST be before '/member/:memberId' to avoid route conflict
router.get('/generate/id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM payments ORDER BY id DESC LIMIT 1');
    let nextId = 'PAY001';
    if (rows.length > 0) {
      const num = parseInt(rows[0].id.replace('PAY', '')) + 1;
      nextId = `PAY${num.toString().padStart(3, '0')}`;
    }
    res.json({ id: nextId });
  } catch (error) {
    console.error('Generate ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate next receipt ID - MUST be before '/member/:memberId' to avoid route conflict
router.get('/generate/receipt-id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT receiptId FROM payments ORDER BY receiptId DESC LIMIT 1');
    let nextId = 'RCP001';
    if (rows.length > 0) {
      const num = parseInt(rows[0].receiptId.replace('RCP', '')) + 1;
      nextId = `RCP${num.toString().padStart(3, '0')}`;
    }
    res.json({ receiptId: nextId });
  } catch (error) {
    console.error('Generate receipt ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments by member ID
router.get('/member/:memberId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE memberId = ? ORDER BY paymentDate DESC',
      [req.params.memberId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payment — also saves a complete receipt snapshot to receipts table
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      id, memberId, membershipId, totalFees, discount = 0, paid, pending,
      paymentMode, receiptId, paymentDate, dueDate, isPendingFeePayment = false,
    } = req.body;

    if (!id || !memberId || !membershipId || !paid || !paymentMode || !receiptId || !paymentDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // 1. Insert payment record
    await pool.execute(
      `INSERT INTO payments (id, memberId, membershipId, totalFees, discount, paid, pending, paymentMode, receiptId, paymentDate, dueDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, memberId, membershipId, totalFees, discount, paid, pending, paymentMode, receiptId, paymentDate, dueDate || null]
    );

    // 2. Fetch member + membership + gym info for receipt snapshot
    const [[memberRow]] = await pool.execute(
      'SELECT name, phone, photo FROM members WHERE memberId = ?',
      [memberId]
    );
    const [[membershipRow]] = await pool.execute(
      'SELECT duration, startDate, endDate FROM memberships WHERE id = ?',
      [membershipId]
    );
    const [[gymRow]] = await pool.execute(
      'SELECT name FROM gym_info ORDER BY id DESC LIMIT 1'
    ).catch(() => [[null]]);

    // 3. Save complete receipt snapshot
    try {
      await pool.execute(
        `INSERT INTO receipts
           (receiptId, paymentId, memberId, memberName, memberPhone, memberPhoto,
            duration, startDate, endDate, totalFees, discount, paid, pending,
            paymentMode, paymentDate, gymName, isPendingFeePayment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           paid = VALUES(paid), pending = VALUES(pending)`,
        [
          receiptId, id, memberId,
          memberRow?.name || null,
          memberRow?.phone || null,
          memberRow?.photo || null,
          membershipRow?.duration || null,
          membershipRow?.startDate || null,
          membershipRow?.endDate || null,
          totalFees, discount, paid, pending,
          paymentMode, paymentDate,
          gymRow?.name || null,
          isPendingFeePayment ? 1 : 0,
        ]
      );
    } catch (receiptErr) {
      // Non-fatal — payment is saved, receipt snapshot failed
      console.error('[Payment] Receipt snapshot failed (non-fatal):', receiptErr.message);
    }

    // 4. Update membership paid/pending
    const [[currentMembership]] = await pool.execute(
      'SELECT paid AS current_paid, pending AS current_pending FROM memberships WHERE id = ?',
      [membershipId]
    );

    if (!currentMembership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    const newPaid = Number(currentMembership.current_paid || 0) + Number(paid);
    const newPending = Math.max(0, Number(currentMembership.current_pending || 0) - Number(paid));

    await pool.execute(
      `UPDATE memberships SET paid = ?, pending = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [newPaid, newPending, membershipId]
    );

    await pool.execute(
      `UPDATE memberships
       SET status = CASE
         WHEN ? = 0 AND endDate >= CURDATE() THEN 'active'
         WHEN endDate < CURDATE() THEN 'expired'
         ELSE status
       END WHERE id = ?`,
      [newPending, membershipId]
    );

    // 5. Update member status to active if membership is now active
    const [[membershipStatus]] = await pool.execute(
      'SELECT status, endDate FROM memberships WHERE id = ?',
      [membershipId]
    );

    if (membershipStatus) {
      const endDateValid = new Date(membershipStatus.endDate) >= new Date();
      if (membershipStatus.status === 'active' || (newPending === 0 && endDateValid)) {
        await pool.execute(
          `UPDATE members SET status = 'active' WHERE memberId = ?`,
          [memberId]
        );
      }
    }

    res.status(201).json({ message: 'Payment recorded successfully', id });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
