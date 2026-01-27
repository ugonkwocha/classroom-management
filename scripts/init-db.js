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
  const dbPassword = parsed.password;

  console.log(`Database: ${dbName}`);
  console.log(`Host: ${dbHost}`);
  console.log(`Port: ${dbPort}`);
  console.log(`User: ${dbUser}`);

  // Wait for PostgreSQL to be ready
  console.log('Waiting for PostgreSQL to be ready...');
  let retries = 30;
  while (retries > 0) {
    try {
      execSync(
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "SELECT 1;" >/dev/null 2>&1`,
        { env: { ...process.env, PGPASSWORD: dbPassword } }
      );
      console.log('PostgreSQL is ready!');
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('ERROR: PostgreSQL failed to become available');
        process.exit(1);
      }
      console.log(`PostgreSQL unavailable, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Create database if it doesn't exist
  console.log(`Creating database "${dbName}" if it doesn't exist...`);
  try {
    execSync(
      `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE \\"${dbName}\\";"`,
      {
        env: { ...process.env, PGPASSWORD: dbPassword },
        stdio: 'pipe'
      }
    );
    console.log(`Database "${dbName}" created or already exists`);
  } catch (error) {
    // Database might already exist, which is fine
    console.log(`Database creation output: ${error.message}`);
  }

  // Run migrations
  console.log('Running Prisma migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('ERROR: Migration failed');
    process.exit(1);
  }

  console.log('Database initialization complete. Starting Next.js server...');
}

initializeDatabase().catch(error => {
  console.error('Fatal error during initialization:', error);
  process.exit(1);
});
