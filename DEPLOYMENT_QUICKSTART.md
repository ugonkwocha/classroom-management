# Coolify Deployment Quick Start

## 🚀 5-Minute Setup

### Prerequisites
- Coolify instance running
- GitHub account with this repository
- PostgreSQL (use Coolify managed or external)

---

## Step 1: Push Deployment Files (Already Done ✓)

The following files are already in the repository:
- `Dockerfile` - Container image definition
- `docker-compose.yml` - Local testing setup
- `.dockerignore` - Files to exclude from image
- `.coolify.json` - Coolify configuration
- `DEPLOYMENT.md` - Full deployment guide

---

## Step 2: Add Coolify to Your Repository

```bash
cd /path/to/academy-enrollment
git add Dockerfile docker-compose.yml .dockerignore .coolify.json DEPLOYMENT.md
git commit -m "Add Coolify deployment configuration"
git push origin main
```

---

## Step 3: Create Coolify Application

### In Coolify Dashboard:

1. **Projects** → **Create New Project**
   - Name: `Academy Enrollment`
   - Description: `Class management and enrollment system`

2. **New Application**
   - Source: Git
   - Repository: `your-github-username/academy-enrollment`
   - Branch: `main`
   - Build Pack: `Dockerfile` (auto-detected)

3. **Set Environment Variables**
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (see below)

4. **Create Database** (Coolify → Databases → PostgreSQL)
   - Name: `academy-enrollment-db`
   - Version: `16`
   - Username: `postgres`
   - Password: (generate strong password)
   
   After creation, copy the connection string and use as `DATABASE_URL`

5. **Port Configuration**
   - Internal Port: `3000`
   - External Port: `80` or `443` (with SSL)

6. **Deploy**
   - Click "Deploy"
   - Wait for build (5-10 minutes)

---

## Step 4: Run Database Setup

After deployment succeeds:

### Option A: Via Coolify SSH
```bash
# SSH into container (from Coolify UI)
npx prisma migrate deploy
```

### Option B: Via Coolify Deployment Hook
In Coolify → Application → Deployment Settings:
- Add command: `npx prisma migrate deploy`

---

## Step 5: Verify Deployment

```bash
# Test the application
curl https://your-domain.com

# Check logs
# Coolify UI → Logs tab

# If issues, see DEPLOYMENT.md troubleshooting section
```

---

## Environment Variables Summary

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |

### DATABASE_URL Format
```
postgresql://username:password@hostname:5432/database_name
```

---

## Common Issues & Quick Fixes

### ❌ Build fails
- Check logs in Coolify
- Ensure Dockerfile exists
- Verify Git branch is correct

### ❌ Database connection error
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running
- Test connection: `psql <DATABASE_URL>`

### ❌ Port/EADDRINUSE
- Change external port in Coolify
- Or stop other services on port 3000

### ❌ Out of memory
- Increase container memory to 1GB in Coolify settings

---

## Verify it Worked

### Application Should:
✅ Load at your domain without errors  
✅ Show login page or dashboard  
✅ Connect to database  
✅ Create/read student data  
✅ Respond in < 2 seconds  

### Check With:
```bash
# Test main page
curl -I https://your-domain.com
# Should return: 200 OK

# Test API
curl https://your-domain.com/api/students
# Should return: JSON data

# View logs
# Coolify UI → Application → Logs
```

---

## Next Steps

1. ✅ Configure domain/SSL in Coolify
2. ✅ Set up automatic backups
3. ✅ Configure monitoring alerts
4. ✅ Test backup restore process
5. ✅ Set up CI/CD auto-deploy on push

---

## Full Documentation

See `DEPLOYMENT.md` for:
- Detailed troubleshooting
- Performance optimization
- Scaling guide
- Backup & recovery
- Monitoring setup
- Update procedures

---

## Support

- **Stuck?** Check `DEPLOYMENT.md` section 6 (Troubleshooting)
- **Coolify Docs**: https://coolify.io/docs
- **Need help?** Check application logs first: Coolify UI → Logs

**You're all set! 🎉**

