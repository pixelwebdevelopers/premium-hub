const mysql = require('mysql2/promise');

async function updateDatabase() {
  console.log('Connecting to MySQL server...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // No password as specified
      database: 'premium_hub',
    });

    console.log('Connected to "premium_hub" database.');

    // Create subscriptions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo_url VARCHAR(255) NULL,
        cover_url VARCHAR(255) NULL,
        is_global TINYINT(1) DEFAULT 1,
        default_price DECIMAL(10, 2) NOT NULL,
        default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        default_description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "subscriptions" verified/created.');

    // Create subscription_country_overrides table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subscription_country_overrides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscription_id INT NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        description TEXT NOT NULL,
        is_visible TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY sub_country (subscription_id, country_code),
        CONSTRAINT fk_sub_overrides FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table "subscription_country_overrides" verified/created.');

    // Clear existing Unsplash placeholder URLs from database
    await connection.query(`
      UPDATE subscriptions 
      SET logo_url = NULL 
      WHERE logo_url LIKE '%unsplash.com%'
    `);
    await connection.query(`
      UPDATE subscriptions 
      SET cover_url = NULL 
      WHERE cover_url LIKE '%unsplash.com%'
    `);
    console.log('Cleared existing Unsplash placeholder URLs from database.');

    // Check if subscriptions exist, if empty seed initial data
    const [subRows] = await connection.query('SELECT id FROM subscriptions LIMIT 1');
    if (subRows.length === 0) {
      console.log('Seeding initial subscriptions...');

      // Seed Netflix
      const [netflixResult] = await connection.query(`
        INSERT INTO subscriptions (name, logo_url, cover_url, is_global, default_price, default_currency, default_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Netflix Premium',
        null,
        null,
        1,
        15.99,
        'USD',
        'Watch Netflix movies & TV shows online or stream right to your smart TV, game console, PC, Mac, mobile, tablet and more.'
      ]);
      const netflixId = netflixResult.insertId;

      // Localized overrides for Netflix (IN and DE)
      await connection.query(`
        INSERT INTO subscription_country_overrides (subscription_id, country_code, price, currency, description, is_visible)
        VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
      `, [
        netflixId, 'IN', 649.00, 'INR', 'Ultra HD streaming on 4 screens simultaneously. Localized Netflix IN package.', 1,
        netflixId, 'DE', 17.99, 'EUR', 'Unbegrenzter Film- und Seriengenuss in Ultra-HD-Qualität.', 1
      ]);

      // Seed Spotify
      const [spotifyResult] = await connection.query(`
        INSERT INTO subscriptions (name, logo_url, cover_url, is_global, default_price, default_currency, default_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Spotify Premium',
        null,
        null,
        1,
        9.99,
        'USD',
        'Play millions of songs ad-free, offline, and on-demand.'
      ]);
      const spotifyId = spotifyResult.insertId;

      // Overrides for Spotify (IN)
      await connection.query(`
        INSERT INTO subscription_country_overrides (subscription_id, country_code, price, currency, description, is_visible)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        spotifyId, 'IN', 119.00, 'INR', 'Ad-free offline music with high-quality streaming. Local Spotify Premium IN.', 1
      ]);

      // Seed YouTube Premium
      const [ytResult] = await connection.query(`
        INSERT INTO subscriptions (name, logo_url, cover_url, is_global, default_price, default_currency, default_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'YouTube Premium',
        null,
        null,
        0, // Visible only in allowed countries
        11.99,
        'USD',
        'YouTube and YouTube Music ad-free, offline, and in the background.'
      ]);
      const ytId = ytResult.insertId;

      // Overrides for YouTube Premium (US and GB - only allowed here)
      await connection.query(`
        INSERT INTO subscription_country_overrides (subscription_id, country_code, price, currency, description, is_visible)
        VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
      `, [
        ytId, 'US', 13.99, 'USD', 'Ad-free YouTube with offline downloads and background play in the United States.', 1,
        ytId, 'GB', 12.99, 'GBP', 'Ad-free YouTube with offline downloads in the United Kingdom.', 1
      ]);

      console.log('Subscriptions seeded successfully!');
    } else {
      console.log('Subscriptions already exist, skipping seeding.');
    }

    console.log('Database upgrade completed successfully!');
  } catch (error) {
    console.error('Error during database update:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateDatabase();
