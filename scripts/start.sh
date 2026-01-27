#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
max_retries=30
retry_count=0
while ! nc -z ${DATABASE_HOST:-localhost} ${DATABASE_PORT:-5432}; do
  retry_count=$((retry_count + 1))
  if [ $retry_count -ge $max_retries ]; then
    echo "PostgreSQL failed to become available after $max_retries attempts"
    exit 1
  fi
  echo "PostgreSQL is unavailable - sleep and retry..."
  sleep 2
done

echo "PostgreSQL is available. Setting up database..."

# Extract database name from DATABASE_URL
DB_URL="${DATABASE_URL}"
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')

echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"

# Create database if it doesn't exist (using postgres default database)
PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
export PGPASSWORD

echo "Creating database if it doesn't exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || echo "Database already exists or error ignored"

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting Next.js application..."
npm start
