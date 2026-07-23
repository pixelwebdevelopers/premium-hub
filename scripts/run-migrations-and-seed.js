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
    const hasMigrations = fs.existsSync(migrationsDir) && 
      fs.readdirSync(migrationsDir).some(file => fs.statSync(path.join(migrationsDir, file)).isDirectory());

    if (hasMigrations) {
      console.log('Migrations directory detected with migrations. Running "prisma migrate deploy"...');
      try {
        console.log('Executing: npx prisma migrate deploy');
        const output = execSync('npx prisma migrate deploy', {
          cwd: path.resolve(__dirname, '..'),
        });
        console.log(output.toString());
      } catch (err) {
        const errorOutput = (err.stdout ? err.stdout.toString() : '') + '\n' + (err.stderr ? err.stderr.toString() : '');
        if (errorOutput.includes('P3005')) {
          const migrationFolders = fs.readdirSync(migrationsDir)
            .filter(file => fs.statSync(path.join(migrationsDir, file)).isDirectory())
            .sort();
          const firstMigration = migrationFolders[0];
          if (firstMigration) {
            console.log(`--- Database is not empty but lacks migration history. Baselining database by marking "${firstMigration}" as applied... ---`);
            execSync(`npx prisma migrate resolve --applied ${firstMigration}`, {
              stdio: 'inherit',
              cwd: path.resolve(__dirname, '..'),
            });
            console.log('Baselining complete. Retrying "npx prisma migrate deploy"...');
            execSync('npx prisma migrate deploy', {
              stdio: 'inherit',
              cwd: path.resolve(__dirname, '..'),
            });
          } else {
            throw err;
          }
        } else {
          console.error('Migration failed:');
          console.error(errorOutput);
          throw err;
        }
      }
    } else {
      console.log('No migrations detected. Running "prisma db push" to sync database schema...');
      console.log('Executing: npx prisma db push --accept-data-loss');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
      });
    }
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
    console.warn('Warning: Database migration and seeding did not complete:', error.message);
    console.warn('Proceeding with build anyway...');
    process.exit(0);
  }
}

main();
