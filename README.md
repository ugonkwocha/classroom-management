# 9jacodekids Academy Enrollment System

A Next.js application for enrolling 9jacodekids Academy students, managing programs and classes, assigning teachers, tracking payments, and reviewing academy analytics.

## Features

- Dashboard analytics for enrollment, capacity, revenue, discounts, and program performance
- Student profile management with parent contact details and multi-country phone support
- Program, course, class, and teacher management
- Program enrollments with batch selection, class assignment, waitlist status, and course history
- Pricing management for full price, sibling discount, and early bird options
- Role-based access for superadmins, admins, and staff
- AWS SES email notifications for class assignments

## Tech Stack

- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- SWR for client-side API data fetching
- JWT authentication with bcrypt password hashing

## Branch And Deployment Model

- `develop` deploys to the Coolify staging app.
- `main` deploys to the Coolify production app.
- Staging and production must use separate Coolify applications and separate PostgreSQL databases.
- Feature work should merge into `develop` first. After staging is verified, merge `develop` into `main` for production.

See [COOLIFY_ENVIRONMENTS.md](COOLIFY_ENVIRONMENTS.md) for the full staging and production setup.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` in `.env`.

4. Apply migrations:

```bash
npm run db:migrate:deploy
```

5. Start the development server:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

## Production Startup

The production start command runs:

```bash
node scripts/init-db.js && next start
```

By default this applies Prisma migrations with `prisma migrate deploy` and does not seed data. Use these environment variables to control startup:

- `DB_INIT_MODE=migrate` for staging and production
- `RUN_DATABASE_SEED=false` for staging and production unless the default admin account needs to be created or reset
- `ALLOW_START_WITH_DB_INIT_FAILURE=false` so failed migrations fail the deployment

## Required Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="generate-a-different-secret-for-each-environment"
NODE_ENV="production"
DB_INIT_MODE="migrate"
RUN_DATABASE_SEED="false"
ALLOW_START_WITH_DB_INIT_FAILURE="false"
```

To create or reset the default superadmin during staging setup, temporarily set:

```env
RUN_DATABASE_SEED="true"
SEED_ADMIN_EMAIL="admin@9jacodekids.com"
SEED_ADMIN_PASSWORD="choose-a-temporary-password"
```

After the account is created, set `RUN_DATABASE_SEED` back to `false` and redeploy.

Email notifications also require:

```env
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-2"
AWS_SES_FROM_EMAIL="admin@9jacodekids.com"
```

## Project Structure

```text
app/                 Next.js routes and API endpoints
components/          Feature and UI components
lib/                 Auth, email, hooks, Prisma client, permissions, utilities
prisma/              Prisma schema and migrations
scripts/             Startup and seed scripts
types/               Shared TypeScript types
```

## Database

The app uses PostgreSQL through Prisma. The main schema is in [prisma/schema.prisma](prisma/schema.prisma), with migrations in [prisma/migrations](prisma/migrations).

## License

Copyright 2024 9jacodekids Academy. All rights reserved.
