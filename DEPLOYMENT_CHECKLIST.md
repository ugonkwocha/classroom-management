# Pre-Deployment Checklist

Use this checklist before deploying to production on Coolify.

---

## Code Quality
- [ ] No TypeScript errors: `npm run build`
- [ ] No console errors or warnings
- [ ] No hardcoded credentials in code
- [ ] All features tested locally
- [ ] Recent commits don't have breaking changes
- [ ] `.env` file is in `.gitignore`

---

## Configuration Files
- [ ] `Dockerfile` exists and is valid
- [ ] `docker-compose.yml` exists
- [ ] `.dockerignore` exists
- [ ] `.coolify.json` exists (optional but recommended)
- [ ] `DEPLOYMENT.md` exists for documentation

---

## Environment & Database
- [ ] PostgreSQL database created in Coolify
- [ ] `DATABASE_URL` connection string tested
- [ ] `NODE_ENV=production` will be set
- [ ] Database has sufficient storage (min 10GB)
- [ ] Database backups configured

---

## Security
- [ ] No secrets in environment variables (use Coolify UI)
- [ ] Strong database password generated
- [ ] HTTPS/SSL will be configured
- [ ] Database user has minimal required permissions
- [ ] `.env` file NOT committed to git
- [ ] No API keys or tokens in code

---

## Application Setup
- [ ] Latest code pushed to main branch: `git push origin main`
- [ ] All deployment files committed: `git add Dockerfile docker-compose.yml .dockerignore .coolify.json`
- [ ] Package.json has correct scripts (`build`, `start`, `dev`)
- [ ] Node version compatible (18+ recommended)
- [ ] All dependencies installable: `npm ci`

---

## Database Migrations
- [ ] All migrations written and tested locally
- [ ] `prisma/schema.prisma` is up to date
- [ ] Migrations can be run on fresh database: `npx prisma migrate deploy`
- [ ] Database seeding script exists and works (optional)
- [ ] No data loss in migration strategy

---

## Build Verification
```bash
# Run this locally before deploying:
rm -rf .next node_modules
npm ci
npm run build
npm start
# Test at http://localhost:3000
```

- [ ] Build completes without errors (< 10 minutes)
- [ ] Application starts successfully
- [ ] API endpoints respond with data
- [ ] No runtime errors in console
- [ ] Application is responsive

---

## Docker Testing
```bash
# Test the Dockerfile locally:
docker build -t academy-enrollment .
docker run -p 3000:3000 --env DATABASE_URL="postgresql://..." academy-enrollment
```

- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] Application accessible on port 3000
- [ ] No out-of-memory errors
- [ ] Health check passes

---

## Docker Compose Testing
```bash
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
curl http://localhost:3000
```

- [ ] docker-compose up succeeds
- [ ] All services start (app + database)
- [ ] Database migrations run successfully
- [ ] Application is accessible
- [ ] Can create/read data through UI/API
- [ ] docker-compose down works cleanly

---

## Coolify Configuration
- [ ] Coolify project created
- [ ] Repository connected (GitHub/GitLab)
- [ ] Branch set to `main`
- [ ] Build pack set to `Dockerfile`
- [ ] `NODE_ENV` environment variable set to `production`
- [ ] `DATABASE_URL` environment variable set
- [ ] Database service created and running
- [ ] Port configured to 3000 (internal) and 80/443 (external)
- [ ] Resource limits set (min 512MB RAM)

---

## Pre-Deployment Testing
- [ ] Database connection tested
- [ ] Migration strategy verified
- [ ] Backup procedure tested
- [ ] Rollback procedure documented
- [ ] Health checks configured
- [ ] Monitoring/logs accessible
- [ ] SSL certificate ready (if using custom domain)

---

## Deployment
- [ ] All checklist items above completed ✓
- [ ] Database backed up before deployment
- [ ] Deployment window scheduled
- [ ] Team notified of deployment
- [ ] Support/on-call person available
- [ ] Rollback plan documented

---

## Post-Deployment Verification
- [ ] Application accessible at domain
- [ ] HTTPS/SSL working (if configured)
- [ ] Database connection successful
- [ ] Can login and create data
- [ ] API endpoints responding
- [ ] No errors in logs
- [ ] Performance acceptable (< 2s page load)
- [ ] Backups automated and tested
- [ ] Monitoring alerts configured

---

## Rollback Plan
In case of issues:

1. **Quick Rollback** (Coolify UI)
   - Select previous commit
   - Click "Deploy"
   - Wait for deployment

2. **Database Rollback**
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

3. **Full Restore**
   - Restore database from backup
   - Deploy previous commit
   - Verify functionality

- [ ] Backup exists and is restorable
- [ ] Previous commits are accessible
- [ ] Rollback procedure documented
- [ ] Team trained on rollback process

---

## Post-Launch Monitoring (First 24 hours)
- [ ] Check logs every 30 minutes
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check database performance
- [ ] Verify backups are working
- [ ] Monitor resource usage
- [ ] Respond to user feedback

---

## Sign-Off
- [ ] Development Lead: __________________ Date: __________
- [ ] DevOps/Deployment: ________________ Date: __________
- [ ] QA: ______________________________ Date: __________

---

**Ready to Deploy?** ✅

Once all items are checked, deployment is ready to proceed.

