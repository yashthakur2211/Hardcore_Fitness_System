// Script to fix admin password in database
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAdminPassword() {
  let connection;
  
  try {
    console.log('🔧 Fixing admin password...\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gymmaster_db',
    });

    console.log('✅ Connected to database\n');

    // Check if admin user exists
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );

    // Generate proper password hash for "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('📝 Generated password hash for "admin123"');

    if (users.length === 0) {
      // Create admin user if it doesn't exist
      console.log('⚠️  Admin user not found. Creating...');
      await connection.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@gymmaster.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin user created successfully!\n');
    } else {
      // Update existing admin user
      console.log('📝 Admin user found. Updating password...');
      await connection.execute(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      console.log('✅ Admin password updated successfully!\n');
    }

    // Verify the password
    const [verify] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );
    
    const isValid = await bcrypt.compare('admin123', verify[0].password);
    
    if (isValid) {
      console.log('✅ Password verification successful!');
      console.log('\n📋 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('\n🎉 You can now login with these credentials!\n');
    } else {
      console.error('❌ Password verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n⚠️  Database does not exist. Please run: npm run init-db');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Database access denied. Please check your credentials in .env file');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminPassword();
