// Helper script to generate bcrypt hash for admin password
// Usage: node createAdminPassword.js <password>
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log('\nPassword hash for:', password);
  console.log('Hash:', hash);
  console.log('\nUpdate the schema.sql file with this hash.\n');
});
