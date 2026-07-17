const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('--- Starting Hostinger Node.js Hook (server.js) ---');

// 1. Run migrations and seeders synchronously before booting Next.js
try {
  console.log('Running automatic database migrations and seed...');
  execSync('node scripts/run-migrations-and-seed.js', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('Database synchronization completed.');
} catch (error) {
  console.error('CRITICAL: Database migration/seeding failed.', error.message);
  process.exit(1);
}

// 2. Start the Next.js production server
console.log('Starting Next.js production server...');
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

const nextServer = spawn('node', [nextBin, 'start'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env
});

// Forward signals to Next.js process for graceful shutdown
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
signals.forEach(signal => {
  process.on(signal, () => {
    console.log(`Forwarding ${signal} to Next.js server...`);
    nextServer.kill(signal);
  });
});

nextServer.on('close', (code) => {
  console.log(`Next.js server exited with code ${code}`);
  process.exit(code || 0);
});

nextServer.on('error', (err) => {
  console.error('Failed to start Next.js server:', err);
  process.exit(1);
});
