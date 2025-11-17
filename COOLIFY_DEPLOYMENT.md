# Coolify Deployment Guide

## Prerequisites
- Coolify instance running (https://coolify.io)
- GitHub repository connected to Coolify
- Docker configured

## Step 1: Set Up PostgreSQL in Coolify

1. **In Coolify Dashboard:**
   - Navigate to your project
   - Click "New Service" → "Database" → "PostgreSQL"
   - Set name: `academy-enrollment-db`
   - Set version: Latest stable (15+)
   - Configure:
     - Database: `academy_enrollment`
     - Username: `postgres`
     - Password: (auto-generated or set custom)
   - Click "Save and Deploy"

2. **Note the connection details:**
   - After deployment, Coolify shows the DATABASE_URL
   - Format: `postgresql://user:password@hostname:port/academy_enrollment`
   - Copy this for the next step

## Step 2: Deploy Next.js Application

1. **Create new application:**
   - Click "New" → "Application"
   - Select your GitHub repository
   - Set build command: `npm run build`
   - Set start command: `npm start`

2. **Configure Environment Variables:**
   - In Coolify app settings, go to "Environment"
   - Add variable: `DATABASE_URL`
   - Paste the PostgreSQL connection string from Step 1
   - Add variable: `NODE_ENV` = `production`
   - Add variable: `NEXTAUTH_SECRET` = (generate a random string for security)

3. **Port Configuration:**
   - Container Port: `3000`
   - Expose to public (unless using reverse proxy)

4. **Resource Limits (for 1000s of students):**
   - Memory: Minimum 1GB, Recommended 2GB+
   - CPU: Minimum 1 core, Recommended 2+ cores
   - Disk: 10GB for OS, 20GB+ for data growth

## Step 3: Configure GitHub Webhook

1. **Automatic Deployments:**
   - In Coolify app settings, scroll to "Webhooks"
   - Copy webhook URL
   - Go to GitHub repo → Settings → Webhooks
   - Add webhook with:
     - Payload URL: (from Coolify)
     - Content type: `application/json`
     - Events: "Push events"

2. **Now every git push triggers automatic deployment**

## Step 4: Run Database Migrations

After first deployment, run migrations:

1. **In Coolify:**
   - Go to your app → "Executions"
   - Click your latest deployment
   - Open "Terminal"
   - Run: `npx prisma migrate deploy`

2. **Or use SSH:**
   ```bash
   # SSH into your Coolify server
   ssh user@coolify-server
   cd /path/to/app
   npx prisma migrate deploy
   ```

## Step 5: Verify Deployment

1. **Check application:**
   - Visit your app URL (shown in Coolify)
   - Verify login page loads
   - Test creating a student to verify database connection

2. **View logs:**
   - In Coolify: App → "Logs"
   - Check for any errors
   - Verify "Database connection successful" message

## Environment Variables Checklist

Required variables in Coolify:
```
DATABASE_URL=postgresql://user:password@host:5432/academy_enrollment
NODE_ENV=production
NEXTAUTH_SECRET=your-random-secret-key-here
```

## Backup & Disaster Recovery

### Automated Backups (recommended)
1. In PostgreSQL service settings: Enable automated backups
2. Set backup frequency: Daily
3. Retention: 30 days minimum

### Manual Backup
```bash
# From Coolify server or local
pg_dump -h hostname -U postgres academy_enrollment > backup.sql

# Restore from backup
psql -h hostname -U postgres academy_enrollment < backup.sql
```

## Monitoring

### Enable Application Monitoring
- Coolify → App → "Monitoring"
- Enable metrics collection
- Monitor:
  - CPU usage
  - Memory usage
  - Request count
  - Error rate

### Set Up Alerts
- Configure email alerts for:
  - High CPU/Memory
  - Application crashes
  - Database connection errors

## Scaling for 1000s of Students

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_students_email ON "Student"(email);
CREATE INDEX idx_enrollments_student ON "ProgramEnrollment"("studentId");
CREATE INDEX idx_enrollments_status ON "ProgramEnrollment"(status);
CREATE INDEX idx_course_history_student ON "CourseHistory"("studentId");
```

### Application Scaling
1. **Vertical Scaling:** Increase server resources (CPU/RAM)
2. **Horizontal Scaling:** Cloudflare caching for static assets
3. **Database:** Consider read replicas if needed

### Performance Tips
- Implement pagination in API endpoints
- Add caching headers to static assets
- Use database connection pooling (already configured via Prisma)
- Monitor slow queries in PostgreSQL logs

## Troubleshooting

### "Database connection refused"
```bash
# SSH into Coolify server
ssh user@coolify-server

# Check PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs postgres_container_name

# Verify DATABASE_URL in app environment
```

### "Prisma migration failed"
```bash
# SSH into app container
docker exec -it app_container bash

# Check migration status
npx prisma migrate status

# Reset migrations (DANGER: deletes data)
npx prisma migrate reset
```

### "502 Bad Gateway"
- Check app logs in Coolify
- Verify DATABASE_URL is correct
- Check container memory usage
- Restart container from Coolify dashboard

### "High memory usage"
- Reduce number of concurrent connections
- Implement request caching
- Scale vertically (more RAM)
- Check for memory leaks in logs

## Post-Deployment Checklist

- [ ] Application accessible via URL
- [ ] Database connection working
- [ ] Can create new student
- [ ] Can create program
- [ ] Can create class
- [ ] Can assign student to class
- [ ] Can promote student from waitlist
- [ ] Can view course history
- [ ] Backups enabled
- [ ] Monitoring enabled
- [ ] GitHub webhooks working (auto-deploy on push)

## Going Live

Before announcing to users:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure daily backups
4. Document support procedures
5. Plan for load testing (1000+ concurrent users)

## Need Help?

- Coolify Docs: https://docs.coolify.io
- PostgreSQL Docs: https://www.postgresql.org/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs
