#!/usr/bin/env node

const { execSync } = require('child_process');
const url = require('url');

async function initializeDatabase() {
  console.log('Starting database initialization...');

  // Get DATABASE_URL from environment
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Parsing DATABASE_URL...');
  const parsed = new URL(dbUrl);
  const dbName = parsed.pathname.slice(1); // Remove leading slash
  const dbHost = parsed.hostname;
  const dbPort = parsed.port || '5432';
  const dbUser = parsed.username;

  console.log(`Database: ${dbName}`);
  console.log(`Host: ${dbHost}`);
  console.log(`Port: ${dbPort}`);
  console.log(`User: ${dbUser}`);

  // Wait for PostgreSQL to be ready
  console.log('Waiting for PostgreSQL to be ready...');
  let retries = 60;
  while (retries > 0) {
    try {
      execSync(
        `nc -z -w 2 ${dbHost} ${dbPort} 2>/dev/null`,
        { stdio: 'pipe' }
      );
      console.log('PostgreSQL is reachable!');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('ERROR: PostgreSQL failed to become available');
        process.exit(1);
      }
      if (retries % 10 === 0) {
        console.log(`PostgreSQL unavailable, retrying... (${retries} attempts left)`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Use Prisma to create database if it doesn't exist and run migrations
  console.log('Creating database schema with Prisma...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('Database schema created/updated successfully');
  } catch (error) {
    console.error('ERROR: Database schema setup failed');
    console.error(error.message);
    process.exit(1);
  }

  console.log('Database initialization complete. Starting Next.js server...');
}

initializeDatabase().catch(error => {
  console.error('Fatal error during initialization:', error);
  process.exit(1);
});
