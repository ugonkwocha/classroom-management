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

  console.log('Database URL is configured, syncing schema...');

  // Sync schema - this will push the schema to the database
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database schema synced successfully');
  } catch (error) {
    // If schema sync fails, still allow server to start
    // (database might not be reachable yet, but will be retried on requests)
    console.warn('WARNING: Database sync attempt failed, but continuing startup');
    console.warn('The app will retry database operations when needed');
  }

  console.log('Database initialization phase complete.');
}

initializeDatabase().catch(error => {
  console.warn('Error during initialization phase:', error.message);
  console.log('Continuing with server startup...');
});
