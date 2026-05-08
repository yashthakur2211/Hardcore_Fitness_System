// Script to create a default user account
// Usage: node createUserAccount.js
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function createUserAccount() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gymmaster_db'
    });

    console.log('✅ Connected to database');

    // Ensure the 'user' role exists in the ENUM (for existing databases)
    try {
      await connection.execute(
        "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user', 'staff') DEFAULT 'user'"
      );
      console.log('✅ Updated role ENUM to include user role');
    } catch (alterError) {
      // Ignore if the alteration fails (might already be correct)
      console.log('ℹ️  Role ENUM already up to date or could not be modified');
    }

    // Check if user account already exists
    const [existingUser] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      ['user']
    );

    if (existingUser.length > 0) {
      console.log('ℹ️  User account already exists');
      console.log('\n📋 User credentials:');
      console.log('   Username: user');
      console.log('   Password: user123');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('user123', 10);

    // Create user account
    await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['user', 'user@gymmaster.com', hashedPassword, 'user']
    );

    console.log('✅ User account created successfully!');
    console.log('\n📋 User credentials:');
    console.log('   Username: user');
    console.log('   Password: user123');
    console.log('\n⚠️  This account has limited access (no Fees and Reports pages)');
    
  } catch (error) {
    console.error('❌ Error creating user account:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createUserAccount();
