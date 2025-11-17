# Quick Start Guide - PostgreSQL Setup

## For This Week: Get Database Running Locally

### Step 1: Install PostgreSQL (5 minutes)
```bash
# macOS with Homebrew
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Verify installation
psql --version
```

### Step 2: Create Database (2 minutes)
```bash
# Open PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE academy_enrollment;

# Verify
\l

# Exit
\q
```

### Step 3: Initialize Prisma Migrations (5 minutes)
```bash
cd /path/to/Academy\ Enrollment

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# This will:
# - Create all database tables
# - Generate Prisma TypeScript client
# - Show migration status
```

### Step 4: Verify Setup (3 minutes)
```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Opens http://localhost:5555
# You can browse and add test data here
```

### Step 5: Run Your App (2 minutes)
```bash
# Terminal 1: Start dev server
npm run dev

# Open http://localhost:3000
# Your app now uses PostgreSQL!
```

---

## What's Configured

✅ **PostgreSQL** - Running locally on port 5432
✅ **Prisma ORM** - Type-safe database queries
✅ **Database Schema** - All 7 models (Student, Program, Class, etc.)
✅ **API Routes** - Student endpoints ready, others follow same pattern
✅ **Environment** - `.env` configured for local development

---

## Test the Database Connection

### Option 1: Prisma Studio (Easiest)
```bash
npx prisma studio
# Browse at http://localhost:5555
```

### Option 2: Command Line
```bash
# Connect to database
psql -U postgres -d academy_enrollment

# List tables
\dt

# View students (empty at first)
SELECT * FROM "Student";

# Exit
\q
```

### Option 3: Test API
```bash
# Create a student
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  }'

# Get all students
curl http://localhost:3000/api/students
```

---

## Next Phase: Complete API Routes

Once local setup is working:

1. **Create remaining API endpoints** (2-3 hours)
   - Programs, Classes, Courses, Teachers, Enrollments, CourseHistory
   - Copy-paste pattern from student routes

2. **Update hooks to use API** (3-4 hours)
   - Install SWR: `npm install swr`
   - Update `lib/hooks/` files
   - Remove all localStorage code

3. **Test everything** (1-2 hours)
   - Create student → program → class
   - Assign student to class
   - Promote from waitlist
   - Mark course as completed

4. **Deploy to Coolify** (1-2 hours)
   - Set up PostgreSQL in Coolify
   - Deploy Next.js app
   - Run migrations
   - Go live!

---

## Troubleshooting

### "Cannot connect to PostgreSQL"
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# If not running:
brew services start postgresql

# Try connecting
psql -U postgres
```

### "database 'academy_enrollment' does not exist"
```bash
# Recreate database
psql -U postgres -c "CREATE DATABASE academy_enrollment;"
```

### "Prisma migration failed"
```bash
# Regenerate client
npx prisma generate

# Check migration status
npx prisma migrate status

# Force reset (WARNING: deletes all data)
npx prisma migrate reset
```

### "API returns 500 error"
Check logs:
```bash
# Check console output where npm run dev is running
# Look for database connection errors
# Verify .env DATABASE_URL is correct
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `.env` | Database connection string |
| `prisma/schema.prisma` | Database schema definition |
| `lib/prisma.ts` | Database client singleton |
| `app/api/students/route.ts` | Student API endpoint |
| `DATABASE_SETUP.md` | Detailed setup guide |
| `API_ROUTES_GUIDE.md` | API documentation |
| `IMPLEMENTATION_SUMMARY.md` | Full roadmap |

---

## You're All Set! 🎉

Your app now has a **production-ready PostgreSQL database** running locally!

### Current State:
- ✅ Database schema created
- ✅ Prisma ORM installed
- ✅ Student API endpoints working
- ✅ Ready for API completion
- ✅ Ready for hook migration
- ✅ Ready for Coolify deployment

### Next: Complete API Routes
See `IMPLEMENTATION_SUMMARY.md` for Phase 1 instructions.

---

## Need Help?

1. **Database issues?** → `DATABASE_SETUP.md`
2. **API questions?** → `API_ROUTES_GUIDE.md`
3. **Full roadmap?** → `IMPLEMENTATION_SUMMARY.md`
4. **Deployment?** → `COOLIFY_DEPLOYMENT.md`

Happy coding! 🚀
