#!/usr/bin/env node

const { execSync } = require('child_process');

async function initializeDatabase() {
  console.log('Starting database initialization...');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('WARNING: DATABASE_URL environment variable is not set');
    console.log('Skipping database initialization and starting Next.js server');
    return;
  }

  const initMode = process.env.DB_INIT_MODE || 'migrate';
  const shouldSeed = process.env.RUN_DATABASE_SEED === 'true';
  const allowStartupOnFailure = process.env.ALLOW_START_WITH_DB_INIT_FAILURE === 'true';

  try {
    if (initMode === 'skip') {
      console.log('DB_INIT_MODE=skip, skipping schema initialization.');
    } else if (initMode === 'push') {
      console.log('Running Prisma db push...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('Database schema pushed successfully');
    } else {
      console.log('Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Database migrations applied successfully');
    }
  } catch (error) {
    console.error('Database initialization failed.');
    if (!allowStartupOnFailure) {
      process.exit(1);
    }

    console.warn('ALLOW_START_WITH_DB_INIT_FAILURE=true, continuing startup despite database initialization failure.');
  }

  if (shouldSeed) {
    try {
      console.log('RUN_DATABASE_SEED=true, ensuring default admin user exists...');
      execSync('node scripts/seed-admin.js', { stdio: 'inherit' });
      console.log('Database seed completed successfully');
    } catch (error) {
      console.error('Database seed failed.');
      if (!allowStartupOnFailure) {
        process.exit(1);
      }

      console.warn('ALLOW_START_WITH_DB_INIT_FAILURE=true, continuing startup despite seed failure.');
    }
  } else {
    console.log('RUN_DATABASE_SEED is not true, skipping database seed.');
  }

  console.log('Database initialization phase complete.');
}

initializeDatabase().catch(error => {
  console.warn('Error during initialization phase:', error.message);
  console.log('Continuing with server startup...');
});
