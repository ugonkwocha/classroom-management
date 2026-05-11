# Coolify Staging And Production Setup

This app should run as two separate Coolify applications backed by two separate Coolify PostgreSQL databases.

## Target Setup

| Environment | Git branch | Coolify app | Database |
| --- | --- | --- | --- |
| Staging | `develop` | `academy-enrollment-staging` | `academy_enrollment_staging` |
| Production | `main` | `academy-enrollment-production` | `academy_enrollment_production` |

## Git Flow

1. Create feature branches from `develop`.
2. Merge feature branches into `develop`.
3. Let Coolify deploy staging from `develop`.
4. Test staging with the staging database.
5. Merge `develop` into `main`.
6. Let Coolify deploy production from `main`.

## Coolify Staging App

Create or update a Coolify application with:

- Repository: `git@github.com:ugonkwocha/classroom-management.git`
- Branch: `develop`
- Build pack: Dockerfile
- Port: `3000`
- Database: a dedicated staging PostgreSQL database

Recommended app name:

```text
academy-enrollment-staging
```

Recommended environment variables:

```env
NODE_ENV=production
DATABASE_URL=<staging-postgres-url>
JWT_SECRET=<unique-staging-secret>
DB_INIT_MODE=migrate
RUN_DATABASE_SEED=false
ALLOW_START_WITH_DB_INIT_FAILURE=false
SEED_ADMIN_EMAIL=admin@9jacodekids.com
SEED_ADMIN_PASSWORD=<temporary-staging-admin-password>
AWS_ACCESS_KEY_ID=<staging-or-shared-ses-key>
AWS_SECRET_ACCESS_KEY=<staging-or-shared-ses-secret>
AWS_REGION=us-east-2
AWS_SES_FROM_EMAIL=admin@9jacodekids.com
```

## Coolify Production App

Create or update a second Coolify application with:

- Repository: `git@github.com:ugonkwocha/classroom-management.git`
- Branch: `main`
- Build pack: Dockerfile
- Port: `3000`
- Database: a dedicated production PostgreSQL database

Recommended app name:

```text
academy-enrollment-production
```

Recommended environment variables:

```env
NODE_ENV=production
DATABASE_URL=<production-postgres-url>
JWT_SECRET=<unique-production-secret>
DB_INIT_MODE=migrate
RUN_DATABASE_SEED=false
ALLOW_START_WITH_DB_INIT_FAILURE=false
AWS_ACCESS_KEY_ID=<production-ses-key>
AWS_SECRET_ACCESS_KEY=<production-ses-secret>
AWS_REGION=us-east-2
AWS_SES_FROM_EMAIL=admin@9jacodekids.com
```

## Database Rules

- Do not point staging and production at the same database.
- Do not run `prisma db push --accept-data-loss` against either Coolify database.
- Use Prisma migrations for both environments.
- Keep `RUN_DATABASE_SEED=false` unless you intentionally want to create or reset the default superadmin in that environment.

## Deployment Verification

After each Coolify deployment:

1. Confirm the build completes.
2. Confirm startup logs show `Database migrations applied successfully`.
3. Log in to the app.
4. Check students, classes, programs, and pricing pages.
5. For staging only, test class assignment email notifications before promoting to production.

## Promotion Checklist

Before merging `develop` into `main`:

- Staging deploy is green.
- Staging login works.
- Staging database migrations completed.
- Student enrollment flow works.
- Class assignment works.
- Email sending is verified or intentionally skipped.
- No staging-only test data or credentials are committed.
