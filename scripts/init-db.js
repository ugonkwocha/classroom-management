#!/usr/bin/env node

const { execSync } = require('child_process');

async function initializeDatabase() {
  console.log('Starting Prisma migrations...');

  // Get DATABASE_URL from environment
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('WARNING: DATABASE_URL environment variable is not set');
    console.log('Skipping migrations and starting Next.js server');
    return;
  }

  console.log('Database URL is configured, running migrations...');

  // Run migrations - this will wait for database to be ready
  try {
    execSync('npx prisma migrate deploy --skip-generate', { stdio: 'inherit' });
    console.log('Migrations completed successfully');
  } catch (error) {
    // If migrations fail, still allow server to start
    // (database might not be reachable yet, but will be retried on requests)
    console.warn('WARNING: Migration attempt failed, but continuing startup');
    console.warn('The app will retry database operations when needed');
  }

  console.log('Database initialization phase complete.');
}

initializeDatabase().catch(error => {
  console.warn('Error during initialization phase:', error.message);
  console.log('Continuing with server startup...');
});
