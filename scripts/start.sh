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

echo "PostgreSQL is available. Running migrations..."
npx prisma migrate deploy

echo "Starting Next.js application..."
npm start
