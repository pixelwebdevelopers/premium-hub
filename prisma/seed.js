/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcryptjs');

// Load environment variables using Next.js built-in env loader
try {
  const { loadEnvConfig } = require('@next/env');
  loadEnvConfig(process.cwd());
  console.log('Environment variables loaded in seeder.');
} catch (error) {
  // Fallback
  console.warn('Skipping seeder env load: ' + error.message);
}

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'premium_hub',
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
};

const prisma = prismaClientSingleton();

async function main() {
  console.log('Seeding database with Prisma...');

  // 1. Seed users
  const adminEmail = 'admin@premiumhub.com';
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin User',
      password_hash: adminPasswordHash,
      role: 'admin',
      can_view_subscriptions: true,
      can_view_analytics: true,
      can_view_settings: true,
    },
  });
  console.log('Admin user verified/seeded.');

  const staffEmail = 'staff@premiumhub.com';
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  await prisma.user.upsert({
    where: { email: staffEmail },
    update: {},
    create: {
      email: staffEmail,
      name: 'Staff User',
      password_hash: staffPasswordHash,
      role: 'staff',
      can_view_subscriptions: true,
      can_view_analytics: false,
      can_view_settings: false,
    },
  });
  console.log('Staff user verified/seeded.');

  // 2. Seed subscriptions and overrides if none exist
  const subscriptionCount = await prisma.subscription.count();
  if (subscriptionCount === 0) {
    console.log('No subscriptions found. Seeding default subscriptions...');

    // Netflix Premium
    await prisma.subscription.create({
      data: {
        name: 'Netflix Premium',
        logo_url: null,
        cover_url: null,
        is_global: true,
        default_shared_price: 4.99,
        default_private_price: 15.99,
        default_currency: 'USD',
        default_description: 'Watch Netflix movies & TV shows online or stream right to your smart TV, game console, PC, Mac, mobile, tablet and more.',
        countries: {
          create: [
            {
              country_code: 'IN',
              shared_price: 199.00,
              private_price: 649.00,
              currency: 'INR',
              description: 'Ultra HD streaming on 4 screens simultaneously. Localized Netflix IN package.',
              is_visible: true,
            },
            {
              country_code: 'DE',
              shared_price: 5.99,
              private_price: 17.99,
              currency: 'EUR',
              description: 'Unbegrenzter Film- und Seriengenuss in Ultra-HD-Qualität.',
              is_visible: true,
            }
          ]
        }
      }
    });

    // Spotify Premium
    await prisma.subscription.create({
      data: {
        name: 'Spotify Premium',
        logo_url: null,
        cover_url: null,
        is_global: true,
        default_shared_price: 9.99,
        default_currency: 'USD',
        default_description: 'Play millions of songs ad-free, offline, and on-demand.',
        countries: {
          create: [
            {
              country_code: 'IN',
              shared_price: 119.00,
              currency: 'INR',
              description: 'Ad-free offline music with high-quality streaming. Local Spotify Premium IN.',
              is_visible: true,
            }
          ]
        }
      }
    });

    // YouTube Premium
    await prisma.subscription.create({
      data: {
        name: 'YouTube Premium',
        logo_url: null,
        cover_url: null,
        is_global: false,
        default_private_price: 11.99,
        default_currency: 'USD',
        default_description: 'YouTube and YouTube Music ad-free, offline, and in the background.',
        countries: {
          create: [
            {
              country_code: 'US',
              private_price: 13.99,
              currency: 'USD',
              description: 'Ad-free YouTube with offline downloads and background play in the United States.',
              is_visible: true,
            },
            {
              country_code: 'GB',
              private_price: 12.99,
              currency: 'GBP',
              description: 'Ad-free YouTube with offline downloads in the United Kingdom.',
              is_visible: true,
            }
          ]
        }
      }
    });

    console.log('Seeding completed successfully!');
  } else {
    console.log('Subscriptions already exist. Skipping default subscriptions seeding.');
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
