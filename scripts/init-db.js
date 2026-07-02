const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  console.log('Connecting to MySQL server...');
  let connection;
  try {
    // Connect without database to create it if it doesn't exist
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // No password as specified
    });

    console.log('Connected to MySQL server successfully.');

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS premium_hub');
    console.log('Database "premium_hub" verified/created.');

    // Switch to premium_hub database
    await connection.query('USE premium_hub');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        can_view_subscriptions TINYINT(1) DEFAULT 0,
        can_view_analytics TINYINT(1) DEFAULT 0,
        can_view_settings TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "users" verified/created.');

    // Seed Admin user
    const [adminRows] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@premiumhub.com']);
    if (adminRows.length === 0) {
      console.log('Seeding admin user...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await connection.query(`
        INSERT INTO users (name, email, password_hash, role, can_view_subscriptions, can_view_analytics, can_view_settings)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Admin User',
        'admin@premiumhub.com',
        adminPasswordHash,
        'admin',
        1, // can_view_subscriptions
        1, // can_view_analytics
        1  // can_view_settings
      ]);
      console.log('Admin user seeded: admin@premiumhub.com / admin123');
    } else {
      console.log('Admin user already exists.');
    }

    // Seed Staff user
    const [staffRows] = await connection.query('SELECT * FROM users WHERE email = ?', ['staff@premiumhub.com']);
    if (staffRows.length === 0) {
      console.log('Seeding staff user...');
      const staffPasswordHash = await bcrypt.hash('staff123', 10);
      await connection.query(`
        INSERT INTO users (name, email, password_hash, role, can_view_subscriptions, can_view_analytics, can_view_settings)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Staff User',
        'staff@premiumhub.com',
        staffPasswordHash,
        'staff',
        1, // can_view_subscriptions
        0, // can_view_analytics
        0  // can_view_settings
      ]);
      console.log('Staff user seeded: staff@premiumhub.com / staff123');
    } else {
      console.log('Staff user already exists.');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
