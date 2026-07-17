const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables using Next.js build-in env loader
try {
  const { loadEnvConfig } = require('@next/env');
  const projectDir = path.resolve(__dirname, '..');
  loadEnvConfig(projectDir);
  console.log('Environment variables loaded successfully.');
} catch (error) {
  console.warn('Could not load environment variables with @next/env. Falling back to default environment.');
}

async function main() {
  const prismaDir = path.resolve(__dirname, '..', 'prisma');
  const migrationsDir = path.join(prismaDir, 'migrations');

  console.log('--- Starting Database Migration & Seeding Hook ---');

  try {
    let migrateCmd = '';
    
    // Check if there are migration files
    const hasMigrations = fs.existsSync(migrationsDir) && 
      fs.readdirSync(migrationsDir).some(file => fs.statSync(path.join(migrationsDir, file)).isDirectory());

    if (hasMigrations) {
      console.log('Migrations directory detected with migrations. Running "prisma migrate deploy"...');
      migrateCmd = 'npx prisma migrate deploy';
    } else {
      console.log('No migrations detected. Running "prisma db push" to sync database schema...');
      migrateCmd = 'npx prisma db push --accept-data-loss';
    }

    console.log(`Executing: ${migrateCmd}`);
    execSync(migrateCmd, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    console.log('Database schema migration/push completed successfully.');

    // Run seeder
    const seedScript = path.join(prismaDir, 'seed.js');
    if (fs.existsSync(seedScript)) {
      console.log('Seeder script detected. Running seed...');
      console.log(`Executing: node prisma/seed.js`);
      execSync('node prisma/seed.js', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
      console.log('Database seeding completed successfully.');
    } else {
      console.warn('No seeder script found at prisma/seed.js. Skipping seeding.');
    }

    console.log('--- Database Migration & Seeding Hook Finished Successfully ---');
  } catch (error) {
    console.error('Error during database migration and seeding:', error.message);
    process.exit(1);
  }
}

main();
