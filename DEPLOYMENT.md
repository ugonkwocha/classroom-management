# Academy Enrollment System - Deployment Guide

## Overview

This guide covers deploying the Academy Enrollment System to Coolify or Docker environments.

### Tech Stack
- **Framework**: Next.js 14 (TypeScript)
- **Database**: PostgreSQL 16
- **Container**: Docker
- **ORM**: Prisma
- **Deployment**: Coolify

---

## Prerequisites

### For Coolify Deployment
- Coolify instance running and accessible
- Docker installed on Coolify host
- PostgreSQL database (can use Coolify's managed database or external)
- Domain name (optional but recommended)

### For Local Docker Testing
- Docker and Docker Compose installed locally
- At least 2GB RAM available
- Port 3000 (app) and 5432 (database) available

---

## Quick Start - Docker Compose

```bash
# 1. Clone or navigate to project directory
cd /path/to/academy-enrollment

# 2. Build and start containers
docker-compose up -d

# 3. Run database migrations
docker-compose exec app npx prisma migrate deploy

# 4. Access the application
# Open browser to: http://localhost:3000
```

---

## Deployment Steps

### 1. Prepare the Application

```bash
# Clean build artifacts
rm -rf .next

# Verify build
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### 2. Database Setup

#### PostgreSQL Connection String Format
```
postgresql://username:password@host:port/database_name
```

#### Examples
- **Local**: `postgresql://postgres:postgres@localhost:5432/academy_enrollment`
- **Coolify**: `postgresql://postgres:password@postgres-service:5432/academy_enrollment`
- **External**: `postgresql://user:pass@db.example.com:5432/academy_enrollment`

### 3. Environment Variables

Set these in Coolify (or in .env for local development):

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/academy_enrollment
```

### 4. Coolify Deployment

#### Step 1: Push to Git Repository
```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "Add deployment files"
git push origin main
```

#### Step 2: Create Coolify Application
1. Log in to Coolify dashboard
2. Create New Project → New Application
3. Select Git Repository source
4. Connect GitHub/GitLab and select this repository
5. Select branch: `main`

#### Step 3: Configure in Coolify
1. **Build**
   - Build Pack: `Dockerfile`
   - Base Directory: `/` (root)

2. **Environment Variables**
   - Add: `NODE_ENV=production`
   - Add: `DATABASE_URL=<your-postgres-connection-string>`

3. **Port**
   - Set to: `3000`

4. **Database** (if using Coolify managed)
   - Create PostgreSQL service
   - Note the connection string
   - Use in `DATABASE_URL`

5. **Deploy**
   - Click "Deploy"
   - Wait for build and deployment

#### Step 4: Post-Deployment
```bash
# SSH into Coolify container
# Run migrations
npx prisma migrate deploy

# Verify with
curl https://yourdomain.com
```

---

## Local Testing with Docker Compose

### Start Services
```bash
docker-compose up -d
```

### Run Migrations
```bash
docker-compose exec app npx prisma migrate deploy
```

### Seed Database (Optional)
```bash
docker-compose exec app npx prisma db seed
```

### View Logs
```bash
docker-compose logs -f app
```

### Stop Services
```bash
docker-compose down
```

### Reset Everything (WARNING: Deletes Database)
```bash
docker-compose down -v
```

---

## Troubleshooting

### Database Connection Issues
```
Error: getaddrinfo ENOTFOUND postgres
```
**Solution**: Ensure PostgreSQL service is running and `DATABASE_URL` is correct.

### Migration Failures
```
Error: P3007 Migration file not found
```
**Solution**:
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

### Build Failures
```
Error: ENOSPC: no space left on device
```
**Solution**: Free up disk space or increase allocated space in Coolify.

### Memory Issues
```
JavaScript heap out of memory
```
**Solution**: Increase container memory in Coolify (recommended: 1GB minimum).

---

## Production Checklist

- [ ] `.env` file not committed to git
- [ ] `DATABASE_URL` configured in Coolify
- [ ] `NODE_ENV=production` set
- [ ] Database migrations run successfully
- [ ] Application accessible via domain
- [ ] HTTPS/SSL configured
- [ ] Backups enabled
- [ ] Monitoring/logs configured
- [ ] Security headers set
- [ ] Database user has limited permissions

---

## Performance Optimization

### Recommended Coolify Settings
- Memory: 1GB minimum, 2GB recommended
- CPU: 0.5 minimum, 1+ recommended
- Storage: 20GB minimum
- Database Memory: 512MB minimum

### Application Optimization
- Enable query logging: Add `?schema=public&log=query` to `DATABASE_URL`
- Monitor slow queries in logs
- Use database indexes (already configured)
- Cache static assets

---

## Scaling

### Horizontal Scaling
1. In Coolify, set number of replicas to 2+
2. Configure load balancer
3. Monitor resource usage

### Vertical Scaling
1. Increase memory/CPU allocation in Coolify
2. Monitor database performance
3. Scale database separately if needed

---

## Backup & Recovery

### Backup Database
```bash
# Using Coolify UI: Database → Backup

# Or manually:
pg_dump -U postgres -d academy_enrollment > backup.sql
```

### Restore Database
```bash
psql -U postgres -d academy_enrollment < backup.sql
```

---

## Monitoring

### Health Checks
- Application: `GET /` should return 200
- Database: Connection test in logs

### Logs to Monitor
```bash
# In Coolify UI or via:
docker logs <container-id>
```

Look for:
- Database connection errors
- Migration failures
- Application crashes
- Performance issues

---

## Updates & Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
npm run build
git commit -m "Update dependencies"
git push origin main
# Coolify auto-deploys
```

### Create Backup Before Updates
1. In Coolify: Database → Backup
2. Wait for completion
3. Test new version locally first

---

## Support

- **Coolify Docs**: https://coolify.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs

