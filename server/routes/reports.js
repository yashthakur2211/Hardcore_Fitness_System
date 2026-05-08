import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive reports data with date filtering
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { period = 'all', year, month, startDate, endDate } = req.query;
    
    let dateFilter = '';
    let dateParams = [];
    
    // Build date filter based on period type
    if (period === 'yearly' && year) {
      dateFilter = 'AND YEAR(p.paymentDate) = ?';
      dateParams = [parseInt(year)];
    } else if (period === 'monthly' && year && month) {
      dateFilter = 'AND YEAR(p.paymentDate) = ? AND MONTH(p.paymentDate) = ?';
      dateParams = [parseInt(year), parseInt(month)];
    } else if (period === 'custom' && startDate && endDate) {
      dateFilter = 'AND p.paymentDate BETWEEN ? AND ?';
      dateParams = [startDate, endDate];
    }

    // Total Revenue
    const [revenueResult] = await pool.execute(
      `SELECT COALESCE(SUM(paid), 0) as totalRevenue, 
              COALESCE(SUM(discount), 0) as totalDiscount,
              COUNT(*) as totalPayments
       FROM payments p
       WHERE 1=1 ${dateFilter}`,
      dateParams
    );

    // Revenue by Payment Mode
    const [paymentModeResult] = await pool.execute(
      `SELECT paymentMode, 
              COALESCE(SUM(paid), 0) as amount,
              COUNT(*) as count
       FROM payments p
       WHERE 1=1 ${dateFilter}
       GROUP BY paymentMode`,
      dateParams
    );

    // Pending Fees Total
    const [pendingResult] = await pool.execute(
      'SELECT COALESCE(SUM(pending), 0) as totalPending FROM memberships WHERE pending > 0'
    );

    // Members Stats
    const [membersStats] = await pool.execute(
      `SELECT 
        COUNT(*) as totalMembers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeMembers,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expiredMembers,
        SUM(CASE WHEN status = 'expiring' THEN 1 ELSE 0 END) as expiringMembers,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledMembers
       FROM members`
    );

    // Membership Duration Distribution
    const [membershipDistribution] = await pool.execute(
      `SELECT duration, COUNT(*) as count, 
              COALESCE(SUM(totalFees), 0) as totalValue
       FROM memberships 
       GROUP BY duration 
       ORDER BY duration`
    );

    // Monthly Revenue Trend (last 12 months)
    const [monthlyRevenue] = await pool.execute(
      `SELECT 
        DATE_FORMAT(paymentDate, '%Y-%m') as month,
        DATE_FORMAT(paymentDate, '%b %Y') as monthLabel,
        COALESCE(SUM(paid), 0) as revenue,
        COUNT(*) as payments
       FROM payments 
       WHERE paymentDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(paymentDate, '%Y-%m'), DATE_FORMAT(paymentDate, '%b %Y')
       ORDER BY month`
    );

    // Member Growth (last 12 months - new registrations per month)
    const [memberGrowth] = await pool.execute(
      `SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        DATE_FORMAT(createdAt, '%b %Y') as monthLabel,
        COUNT(*) as newMembers
       FROM members 
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b %Y')
       ORDER BY month`
    );

    // Daily Revenue (last 30 days)
    const [dailyRevenue] = await pool.execute(
      `SELECT 
        DATE(paymentDate) as date,
        DATE_FORMAT(paymentDate, '%d %b') as dateLabel,
        COALESCE(SUM(paid), 0) as revenue,
        COUNT(*) as payments
       FROM payments 
       WHERE paymentDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(paymentDate), DATE_FORMAT(paymentDate, '%d %b')
       ORDER BY date`
    );

    // Today's Stats
    const today = new Date().toISOString().split('T')[0];
    const [todayStats] = await pool.execute(
      `SELECT 
        (SELECT COALESCE(SUM(paid), 0) FROM payments WHERE paymentDate = ?) as todayRevenue,
        (SELECT COUNT(*) FROM payments WHERE paymentDate = ?) as todayPayments,
        (SELECT COUNT(*) FROM attendance WHERE date = ?) as todayAttendance,
        (SELECT COUNT(*) FROM members WHERE DATE(createdAt) = ?) as todayRegistrations`,
      [today, today, today, today]
    );

    // This Month's Stats
    const [thisMonthStats] = await pool.execute(
      `SELECT 
        COALESCE(SUM(paid), 0) as monthRevenue,
        COUNT(*) as monthPayments
       FROM payments 
       WHERE YEAR(paymentDate) = YEAR(CURDATE()) 
       AND MONTH(paymentDate) = MONTH(CURDATE())`
    );

    // Average Daily Revenue (this month)
    const [avgDailyRevenue] = await pool.execute(
      `SELECT COALESCE(AVG(daily_revenue), 0) as avgDaily FROM (
        SELECT SUM(paid) as daily_revenue 
        FROM payments 
        WHERE YEAR(paymentDate) = YEAR(CURDATE()) 
        AND MONTH(paymentDate) = MONTH(CURDATE())
        GROUP BY DATE(paymentDate)
       ) as daily_totals`
    );

    // Top 5 Members by Payment
    const [topMembers] = await pool.execute(
      `SELECT 
        m.memberId, m.name, m.phone, m.photo,
        COALESCE(SUM(p.paid), 0) as totalPaid,
        COUNT(p.id) as paymentCount
       FROM members m
       LEFT JOIN payments p ON m.memberId = p.memberId
       GROUP BY m.memberId, m.name, m.phone, m.photo
       ORDER BY totalPaid DESC
       LIMIT 5`
    );

    // Attendance Rate (last 30 days)
    const [attendanceStats] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT a.memberId) as uniqueAttendees,
        COUNT(*) as totalCheckIns
       FROM attendance a
       WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    res.json({
      revenue: {
        total: parseFloat(revenueResult[0].totalRevenue) || 0,
        totalDiscount: parseFloat(revenueResult[0].totalDiscount) || 0,
        totalPayments: revenueResult[0].totalPayments || 0,
        pending: parseFloat(pendingResult[0].totalPending) || 0,
        today: parseFloat(todayStats[0].todayRevenue) || 0,
        thisMonth: parseFloat(thisMonthStats[0].monthRevenue) || 0,
        avgDaily: parseFloat(avgDailyRevenue[0].avgDaily) || 0,
      },
      members: {
        total: membersStats[0].totalMembers || 0,
        active: membersStats[0].activeMembers || 0,
        expired: membersStats[0].expiredMembers || 0,
        expiring: membersStats[0].expiringMembers || 0,
        cancelled: membersStats[0].cancelledMembers || 0,
        todayRegistrations: todayStats[0].todayRegistrations || 0,
      },
      attendance: {
        todayCheckIns: todayStats[0].todayAttendance || 0,
        uniqueAttendees30Days: attendanceStats[0].uniqueAttendees || 0,
        totalCheckIns30Days: attendanceStats[0].totalCheckIns || 0,
      },
      paymentModes: paymentModeResult.map(pm => ({
        mode: pm.paymentMode,
        amount: parseFloat(pm.amount) || 0,
        count: pm.count || 0,
      })),
      membershipDistribution: membershipDistribution.map(md => ({
        duration: md.duration,
        label: md.duration === 1 ? '1 Month' : `${md.duration} Months`,
        count: md.count || 0,
        totalValue: parseFloat(md.totalValue) || 0,
      })),
      trends: {
        monthlyRevenue: monthlyRevenue.map(mr => ({
          month: mr.month,
          label: mr.monthLabel,
          revenue: parseFloat(mr.revenue) || 0,
          payments: mr.payments || 0,
        })),
        memberGrowth: memberGrowth.map(mg => ({
          month: mg.month,
          label: mg.monthLabel,
          newMembers: mg.newMembers || 0,
        })),
        dailyRevenue: dailyRevenue.map(dr => ({
          date: dr.date,
          label: dr.dateLabel,
          revenue: parseFloat(dr.revenue) || 0,
          payments: dr.payments || 0,
        })),
      },
      topMembers: topMembers.map(tm => ({
        memberId: tm.memberId,
        name: tm.name,
        phone: tm.phone,
        photo: tm.photo,
        totalPaid: parseFloat(tm.totalPaid) || 0,
        paymentCount: tm.paymentCount || 0,
      })),
    });
  } catch (error) {
    console.error('Get reports overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get filtered revenue data
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const { period = 'monthly', year, month, startDate, endDate } = req.query;
    
    let query = '';
    let params = [];
    
    if (period === 'daily') {
      // Daily revenue for selected month/year
      const targetYear = year || new Date().getFullYear();
      const targetMonth = month || (new Date().getMonth() + 1);
      query = `
        SELECT 
          DATE(paymentDate) as date,
          DAY(paymentDate) as day,
          COALESCE(SUM(paid), 0) as revenue,
          COUNT(*) as payments
        FROM payments 
        WHERE YEAR(paymentDate) = ? AND MONTH(paymentDate) = ?
        GROUP BY DATE(paymentDate), DAY(paymentDate)
        ORDER BY date
      `;
      params = [parseInt(targetYear), parseInt(targetMonth)];
    } else if (period === 'monthly') {
      // Monthly revenue for selected year
      const targetYear = year || new Date().getFullYear();
      query = `
        SELECT 
          MONTH(paymentDate) as month,
          DATE_FORMAT(paymentDate, '%b') as monthLabel,
          COALESCE(SUM(paid), 0) as revenue,
          COUNT(*) as payments
        FROM payments 
        WHERE YEAR(paymentDate) = ?
        GROUP BY MONTH(paymentDate), DATE_FORMAT(paymentDate, '%b')
        ORDER BY month
      `;
      params = [parseInt(targetYear)];
    } else if (period === 'yearly') {
      // Yearly revenue for all years
      query = `
        SELECT 
          YEAR(paymentDate) as year,
          COALESCE(SUM(paid), 0) as revenue,
          COUNT(*) as payments
        FROM payments 
        GROUP BY YEAR(paymentDate)
        ORDER BY year
      `;
      params = [];
    } else if (period === 'custom' && startDate && endDate) {
      query = `
        SELECT 
          DATE(paymentDate) as date,
          DATE_FORMAT(paymentDate, '%d %b') as dateLabel,
          COALESCE(SUM(paid), 0) as revenue,
          COUNT(*) as payments
        FROM payments 
        WHERE paymentDate BETWEEN ? AND ?
        GROUP BY DATE(paymentDate), DATE_FORMAT(paymentDate, '%d %b')
        ORDER BY date
      `;
      params = [startDate, endDate];
    }
    
    const [result] = await pool.execute(query, params);
    
    res.json(result.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue) || 0,
    })));
  } catch (error) {
    console.error('Get revenue data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get members filtered by status for drill-down
router.get('/members-by-status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let rows = [];

    if (status === 'active') {
      [rows] = await pool.execute(`
        SELECT m.memberId, m.name, m.phone, m.status, m.photo,
               ms.startDate, ms.endDate, ms.totalFees, ms.paid, ms.pending, ms.duration
        FROM members m
        LEFT JOIN memberships ms ON m.memberId = ms.memberId
          AND ms.endDate = (SELECT MAX(endDate) FROM memberships WHERE memberId = m.memberId)
        WHERE m.status = 'active'
        ORDER BY ms.endDate ASC
      `);
    } else if (status === 'expired') {
      [rows] = await pool.execute(`
        SELECT m.memberId, m.name, m.phone, m.status, m.photo,
               ms.startDate, ms.endDate, ms.totalFees, ms.paid, ms.pending, ms.duration
        FROM members m
        LEFT JOIN memberships ms ON m.memberId = ms.memberId
          AND ms.endDate = (SELECT MAX(endDate) FROM memberships WHERE memberId = m.memberId)
        WHERE m.status = 'expired'
        ORDER BY ms.endDate DESC
      `);
    } else if (status === 'expiring') {
      [rows] = await pool.execute(`
        SELECT m.memberId, m.name, m.phone, m.status, m.photo,
               ms.startDate, ms.endDate, ms.totalFees, ms.paid, ms.pending, ms.duration,
               DATEDIFF(ms.endDate, CURDATE()) as daysLeft
        FROM members m
        JOIN memberships ms ON m.memberId = ms.memberId
        WHERE ms.endDate >= CURDATE()
          AND ms.endDate = (SELECT MAX(endDate) FROM memberships WHERE memberId = m.memberId)
          AND m.status = 'active'
          AND (DATEDIFF(ms.endDate, ms.startDate) * 0.5) >= DATEDIFF(ms.endDate, CURDATE())
        ORDER BY ms.endDate ASC
      `);
    } else if (status === 'cancelled') {
      [rows] = await pool.execute(`
        SELECT m.memberId, m.name, m.phone, m.status, m.photo,
               ms.startDate, ms.endDate, ms.totalFees, ms.paid, ms.pending, ms.duration
        FROM members m
        LEFT JOIN memberships ms ON m.memberId = ms.memberId
          AND ms.endDate = (SELECT MAX(endDate) FROM memberships WHERE memberId = m.memberId)
        WHERE m.status = 'cancelled'
        ORDER BY m.createdAt DESC
      `);
    } else if (status === 'pending-fees') {
      [rows] = await pool.execute(`
        SELECT m.memberId, m.name, m.phone, m.status, m.photo,
               SUM(ms.pending) as totalPending, SUM(ms.paid) as totalPaid
        FROM members m
        JOIN memberships ms ON m.memberId = ms.memberId
        WHERE ms.pending > 0
        GROUP BY m.memberId, m.name, m.phone, m.status, m.photo
        ORDER BY totalPending DESC
      `);
    } else {
      return res.status(400).json({ error: 'Invalid status' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Get members by status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments for a specific date
router.get('/payments-by-date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const [payments] = await pool.execute(
      `SELECT p.*, m.name as memberName, m.phone as memberPhone
       FROM payments p
       LEFT JOIN members m ON p.memberId = m.memberId
       WHERE DATE(p.paymentDate) = ?
       ORDER BY p.paymentDate DESC`,
      [date]
    );

    const [summary] = await pool.execute(
      `SELECT COUNT(*) as totalPayments,
              COALESCE(SUM(totalFees), 0) as totalFees,
              COALESCE(SUM(paid), 0) as totalPaid,
              COALESCE(SUM(discount), 0) as totalDiscount,
              COALESCE(SUM(pending), 0) as totalPending
       FROM payments WHERE DATE(paymentDate) = ?`,
      [date]
    );

    res.json({
      payments: payments.map(p => ({
        ...p,
        paid: parseFloat(p.paid) || 0,
        totalFees: parseFloat(p.totalFees) || 0,
        discount: parseFloat(p.discount) || 0,
        pending: parseFloat(p.pending) || 0,
      })),
      summary: {
        totalPayments: summary[0].totalPayments || 0,
        totalFees: parseFloat(summary[0].totalFees) || 0,
        totalPaid: parseFloat(summary[0].totalPaid) || 0,
        totalDiscount: parseFloat(summary[0].totalDiscount) || 0,
        totalPending: parseFloat(summary[0].totalPending) || 0,
      },
    });
  } catch (error) {
    console.error('Get payments by date error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payments between two dates (range report)
router.get('/payments-range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const [payments] = await pool.execute(
      `SELECT p.*, m.name as memberName, m.phone as memberPhone
       FROM payments p
       LEFT JOIN members m ON p.memberId = m.memberId
       WHERE DATE(p.paymentDate) BETWEEN ? AND ?
       ORDER BY p.paymentDate DESC`,
      [startDate, endDate]
    );

    const [summary] = await pool.execute(
      `SELECT COUNT(*) as totalPayments,
              COALESCE(SUM(totalFees), 0) as totalFees,
              COALESCE(SUM(paid), 0) as totalPaid,
              COALESCE(SUM(discount), 0) as totalDiscount,
              COALESCE(SUM(pending), 0) as totalPending
       FROM payments WHERE DATE(paymentDate) BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [byMode] = await pool.execute(
      `SELECT paymentMode, COUNT(*) as count, COALESCE(SUM(paid), 0) as amount
       FROM payments WHERE DATE(paymentDate) BETWEEN ? AND ?
       GROUP BY paymentMode`,
      [startDate, endDate]
    );

    const [daily] = await pool.execute(
      `SELECT DATE(paymentDate) as date,
              DATE_FORMAT(paymentDate, '%d %b %Y') as dateLabel,
              COUNT(*) as payments,
              COALESCE(SUM(paid), 0) as revenue
       FROM payments WHERE DATE(paymentDate) BETWEEN ? AND ?
       GROUP BY DATE(paymentDate), DATE_FORMAT(paymentDate, '%d %b %Y')
       ORDER BY date`,
      [startDate, endDate]
    );

    res.json({
      payments: payments.map(p => ({
        ...p,
        paid: parseFloat(p.paid) || 0,
        totalFees: parseFloat(p.totalFees) || 0,
        discount: parseFloat(p.discount) || 0,
        pending: parseFloat(p.pending) || 0,
      })),
      summary: {
        totalPayments: summary[0].totalPayments || 0,
        totalFees: parseFloat(summary[0].totalFees) || 0,
        totalPaid: parseFloat(summary[0].totalPaid) || 0,
        totalDiscount: parseFloat(summary[0].totalDiscount) || 0,
        totalPending: parseFloat(summary[0].totalPending) || 0,
      },
      byMode: byMode.map(m => ({ mode: m.paymentMode, count: m.count, amount: parseFloat(m.amount) || 0 })),
      daily: daily.map(d => ({
        date: d.date,
        label: d.dateLabel,
        payments: d.payments,
        revenue: parseFloat(d.revenue) || 0,
      })),
    });
  } catch (error) {
    console.error('Get payments range error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit / profit report
router.get('/audit', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? 'WHERE DATE(paymentDate) BETWEEN ? AND ?' : '';
    const params = startDate && endDate ? [startDate, endDate] : [];
    const memberFilter = startDate && endDate ? 'WHERE DATE(createdAt) BETWEEN ? AND ?' : '';
    const memberParams = startDate && endDate ? [startDate, endDate] : [];

    const [revSummary] = await pool.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalFees), 0) as grossRevenue,
              COALESCE(SUM(paid), 0) as collectedAmount,
              COALESCE(SUM(discount), 0) as totalDiscounts,
              COALESCE(SUM(pending), 0) as pendingAmount
       FROM payments ${dateFilter}`,
      params
    );

    const [newMembersResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM members ${memberFilter}`,
      memberParams
    );

    const [activeMemberships] = await pool.execute(
      `SELECT COUNT(*) as count FROM memberships WHERE endDate >= CURDATE()`
    );

    const [byMode] = await pool.execute(
      `SELECT paymentMode, COUNT(*) as count,
              COALESCE(SUM(paid), 0) as amount,
              COALESCE(SUM(discount), 0) as discounts
       FROM payments ${dateFilter}
       GROUP BY paymentMode`,
      params
    );

    const [monthlyTrend] = await pool.execute(
      `SELECT DATE_FORMAT(paymentDate, '%Y-%m') as month,
              DATE_FORMAT(paymentDate, '%b %Y') as monthLabel,
              COUNT(*) as transactions,
              COALESCE(SUM(paid), 0) as collected,
              COALESCE(SUM(discount), 0) as discounts,
              COALESCE(SUM(pending), 0) as pending
       FROM payments ${dateFilter}
       GROUP BY DATE_FORMAT(paymentDate, '%Y-%m'), DATE_FORMAT(paymentDate, '%b %Y')
       ORDER BY month`,
      params
    );

    const [topMembers] = await pool.execute(
      `SELECT m.memberId, m.name, m.phone,
              COUNT(p.id) as transactions,
              COALESCE(SUM(p.paid), 0) as totalPaid,
              COALESCE(SUM(p.discount), 0) as totalDiscount
       FROM payments p
       LEFT JOIN members m ON p.memberId = m.memberId
       ${dateFilter}
       GROUP BY p.memberId, m.memberId, m.name, m.phone
       ORDER BY totalPaid DESC
       LIMIT 10`,
      params
    );

    const gross = parseFloat(revSummary[0].grossRevenue) || 0;
    const collected = parseFloat(revSummary[0].collectedAmount) || 0;
    const discounts = parseFloat(revSummary[0].totalDiscounts) || 0;
    const pending = parseFloat(revSummary[0].pendingAmount) || 0;
    const collectionEfficiency = gross > 0 ? parseFloat(((collected / gross) * 100).toFixed(1)) : 0;

    res.json({
      summary: {
        totalTransactions: revSummary[0].totalTransactions || 0,
        grossRevenue: gross,
        collectedAmount: collected,
        totalDiscounts: discounts,
        pendingAmount: pending,
        netRevenue: collected - discounts,
        collectionEfficiency,
        newMembers: newMembersResult[0].count || 0,
        activeMemberships: activeMemberships[0].count || 0,
      },
      byMode: byMode.map(m => ({
        mode: m.paymentMode,
        count: m.count,
        amount: parseFloat(m.amount) || 0,
        discounts: parseFloat(m.discounts) || 0,
      })),
      monthlyTrend: monthlyTrend.map(mt => ({
        month: mt.month,
        label: mt.monthLabel,
        transactions: mt.transactions,
        collected: parseFloat(mt.collected) || 0,
        discounts: parseFloat(mt.discounts) || 0,
        pending: parseFloat(mt.pending) || 0,
      })),
      topMembers: topMembers.map(tm => ({
        memberId: tm.memberId,
        name: tm.name,
        phone: tm.phone,
        transactions: tm.transactions,
        totalPaid: parseFloat(tm.totalPaid) || 0,
        totalDiscount: parseFloat(tm.totalDiscount) || 0,
      })),
    });
  } catch (error) {
    console.error('Get audit report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available years for filtering
router.get('/years', authenticateToken, async (req, res) => {
  try {
    const [years] = await pool.execute(
      `SELECT DISTINCT YEAR(paymentDate) as year 
       FROM payments 
       ORDER BY year DESC`
    );
    
    // Add current year if not in list
    const currentYear = new Date().getFullYear();
    const yearList = years.map(y => y.year);
    if (!yearList.includes(currentYear)) {
      yearList.unshift(currentYear);
    }
    
    res.json(yearList);
  } catch (error) {
    console.error('Get years error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
