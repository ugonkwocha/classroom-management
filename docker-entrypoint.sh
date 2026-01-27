#!/bin/sh
set -e

echo "=== Database Initialization Script ==="
echo "Starting database setup..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Use node to parse the URL and run the init script
node << 'EOF'
const { execSync } = require('child_process');
const url = require('url');

async function initializeDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('Parsing DATABASE_URL...');

  const parsed = new URL(dbUrl);
  const dbName = parsed.pathname.slice(1);
  const dbHost = parsed.hostname;
  const dbPort = parsed.port || '5432';
  const dbUser = parsed.username;
  const dbPassword = parsed.password;

  console.log(`Database: ${dbName}`);
  console.log(`Host: ${dbHost}`);
  console.log(`Port: ${dbPort}`);
  console.log(`User: ${dbUser}`);

  // Wait for PostgreSQL
  console.log('Waiting for PostgreSQL to be ready...');
  let retries = 30;
  while (retries > 0) {
    try {
      execSync(
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "SELECT 1;" 2>/dev/null`,
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

  // Create database
  console.log(`Creating database "${dbName}" if missing...`);
  try {
    execSync(
      `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE \\"${dbName}\\";" 2>/dev/null`,
      { env: { ...process.env, PGPASSWORD: dbPassword } }
    );
    console.log('Database created or already exists');
  } catch (error) {
    console.log('Database creation attempt completed');
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

  console.log('Database initialization complete!');
}

initializeDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
EOF

echo ""
echo "=== Starting Next.js Server ==="
exec npm start
