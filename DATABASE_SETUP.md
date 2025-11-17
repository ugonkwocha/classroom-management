# Local PostgreSQL Database Setup Guide

## Prerequisites
- PostgreSQL installed (https://www.postgresql.org/download/)
- psql command-line tool available

## Step 1: Create Database

Run these commands in your terminal:

```bash
# Start PostgreSQL (if not running)
# macOS with Homebrew:
brew services start postgresql

# Connect to PostgreSQL
psql -U postgres

# In the PostgreSQL prompt, create the database:
CREATE DATABASE academy_enrollment;

# Verify creation:
\l

# Exit psql:
\q
```

## Step 2: Update .env File

The `.env` file already contains:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academy_enrollment"
```

**If your PostgreSQL setup is different, update accordingly:**
- Default user is usually `postgres`
- Default password is `postgres` (you may have set something different)
- Default port is `5432`

## Step 3: Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# This will:
# 1. Create all database tables
# 2. Generate Prisma TypeScript client
# 3. Create migration files for version control
```

## Step 4: Verify Setup

```bash
# Open Prisma Studio (visual DB browser)
npx prisma studio

# This opens http://localhost:5555 in your browser
# You can browse and edit data visually
```

## Step 5: Test with Sample Data

```bash
# Run the local Next.js dev server
npm run dev

# Navigate to http://localhost:3000
# Your app now uses PostgreSQL instead of localStorage
```

## Database Management

### Viewing Database
```bash
# Open Prisma Studio
npx prisma studio

# Or use psql
psql -U postgres -d academy_enrollment -c "SELECT * FROM \"Student\";"
```

### Resetting Database (deletes all data)
```bash
# WARNING: This deletes ALL data
npx prisma migrate reset
```

### Creating New Migrations
After modifying `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name describe_your_changes
```

## Troubleshooting

### "Connection refused" on port 5432
PostgreSQL isn't running. Start it:
```bash
# macOS with Homebrew
brew services start postgresql

# Or check if it's already running
brew services list
```

### "FATAL: role 'postgres' does not exist"
PostgreSQL needs initialization. See your OS installation guide.

### "database 'academy_enrollment' does not exist"
Run the CREATE DATABASE command from Step 1.

### Prisma Client Generation Failed
```bash
# Regenerate the Prisma Client
npx prisma generate

# If still failing, try clearing cache
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

## Next Steps

Once database is set up:
1. Generate TypeScript types with `npx prisma generate`
2. Create API routes in `app/api/`
3. Update hooks to call API routes instead of localStorage
4. Test CRUD operations locally

## Production Deployment (Coolify)

When deploying to Coolify:
1. Set `DATABASE_URL` environment variable in Coolify settings
2. Coolify will run migrations automatically on deploy
3. Use managed PostgreSQL service in Coolify for production database
