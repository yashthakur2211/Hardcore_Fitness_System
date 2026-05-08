import pool from '../config/database.js';

async function checkMembershipData() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, memberId, totalFees, paid, pending 
       FROM memberships 
       ORDER BY createdAt DESC 
       LIMIT 5`
    );
    
    console.log('\n=== Membership Data Check ===\n');
    rows.forEach(row => {
      console.log(`Membership ID: ${row.id}`);
      console.log(`  Member ID: ${row.memberId}`);
      console.log(`  Total Fees: ${row.totalFees}`);
      console.log(`  Paid (column): ${row.paid}`);
      console.log(`  Pending (column): ${row.pending}`);
      console.log(`  Paid + Pending: ${Number(row.paid) + Number(row.pending)}`);
      console.log(`  Total Fees Match: ${Number(row.totalFees) === (Number(row.paid) + Number(row.pending)) ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMembershipData();
