import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get all members with their latest membership
    const [members] = await pool.execute('SELECT * FROM members');
    const [allMemberships] = await pool.execute('SELECT * FROM memberships ORDER BY endDate DESC');
    
    // Helper: Get latest membership for a member
    const getLatestMembership = (memberId) => {
      return allMemberships.find(m => m.memberId === memberId) || null;
    };
    
    // Helper: Get membership status based on dates (matches frontend logic)
    const getMembershipStatus = (membership) => {
      if (!membership) return 'none';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(membership.endDate);
      endDate.setHours(0, 0, 0, 0);
      const startDate = new Date(membership.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // Check if expired
      if (endDate < today) {
        return 'expired';
      }
      
      // Calculate percentage remaining
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      const percentageRemaining = (remainingDays / totalDays) * 100;
      
      // If less than 50% remaining, show as expiring
      if (percentageRemaining <= 50) {
        return 'expiring';
      }
      
      return 'active';
    };
    
    // Helper: Get total pending fees for a member
    const getTotalPendingFees = (memberId) => {
      return allMemberships
        .filter(m => m.memberId === memberId)
        .reduce((total, m) => total + (m.pending || 0), 0);
    };
    
    // Count stats based on actual data
    let pendingFeesCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let birthdaysCount = 0;
    
    const today = new Date();
    
    members.forEach(member => {
      const membership = getLatestMembership(member.memberId);
      const membershipStatus = getMembershipStatus(membership);
      const pendingFees = getTotalPendingFees(member.memberId);
      
      // Pending fees
      if (pendingFees > 0) {
        pendingFeesCount++;
      }
      
      // Cancelled - check member.status only
      if (member.status === 'cancelled') {
        cancelledCount++;
      }
      
      // Expired - matches frontend: membershipStatus === 'expired' || member.status === 'expired'
      if (membershipStatus === 'expired' || member.status === 'expired') {
        expiredCount++;
      }
      
      // Expiring - only membershipStatus
      if (membershipStatus === 'expiring') {
        expiringCount++;
      }
      
      // Active - matches frontend: membershipStatus === 'active' || member.status === 'active'
      if (membershipStatus === 'active' || member.status === 'active') {
        activeCount++;
      }
      
      // Birthdays
      if (member.dob) {
        const dob = new Date(member.dob);
        if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
          birthdaysCount++;
        }
      }
    });

    // Absent today (active members not in attendance today)
    const [absent] = await pool.execute(
      `SELECT COUNT(*) as count FROM members m
       LEFT JOIN attendance a ON m.memberId = a.memberId AND a.date = CURDATE()
       WHERE m.status = 'active' AND a.id IS NULL`
    );

    // Today's enquiries
    const [enquiries] = await pool.execute(
      'SELECT COUNT(*) as count FROM enquiries WHERE visitDate = CURDATE()'
    );

    res.json({
      pendingFees: pendingFeesCount,
      expiring: expiringCount,
      expired: expiredCount,
      birthdays: birthdaysCount,
      absent: absent[0].count,
      enquiries: enquiries[0].count,
      active: activeCount,
      cancelled: cancelledCount
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get gym info
router.get('/gym-info', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM gym_info ORDER BY id DESC LIMIT 1');
    res.json(rows[0] || null);
  } catch (error) {
    console.error('Get gym info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get fee structure
router.get('/fee-structure', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM fee_structure ORDER BY duration');
    res.json(rows);
  } catch (error) {
    console.error('Get fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fee structure (admin only)
router.put('/fee-structure/:duration', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const duration = parseInt(req.params.duration, 10);
    const { basePrice, offerPrice, offerName, isOfferActive, ptBasePrice, ptOfferPrice, ptOfferName, isPtOfferActive } = req.body;

    if (!duration || !basePrice) {
      return res.status(400).json({ error: 'duration and basePrice are required' });
    }

    await pool.execute(
      `INSERT INTO fee_structure (duration, basePrice, offerPrice, offerName, isOfferActive, ptBasePrice, ptOfferPrice, ptOfferName, isPtOfferActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         basePrice = VALUES(basePrice),
         offerPrice = VALUES(offerPrice),
         offerName = VALUES(offerName),
         isOfferActive = VALUES(isOfferActive),
         ptBasePrice = VALUES(ptBasePrice),
         ptOfferPrice = VALUES(ptOfferPrice),
         ptOfferName = VALUES(ptOfferName),
         isPtOfferActive = VALUES(isPtOfferActive)`,
      [
        duration,
        basePrice,
        offerPrice ?? null,
        offerName ?? null,
        !!isOfferActive,
        ptBasePrice ?? 0,
        ptOfferPrice ?? null,
        ptOfferName ?? null,
        !!isPtOfferActive,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM fee_structure ORDER BY duration');
    res.json({ message: 'Fee structure updated', fees: rows });
  } catch (error) {
    console.error('Update fee structure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
