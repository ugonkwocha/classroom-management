# Academy Enrollment - Deployment Guide

## Current Status
Your application currently uses **localStorage** (browser-only storage). For production deployment on Coolify, you need to migrate to a proper database backend.

## Deployment Strategy

### Option 1: PostgreSQL + Prisma (Recommended)
**Best for:** Production-grade apps, relational data, strong typing
- **Database:** PostgreSQL
- **ORM:** Prisma (handles migrations, type safety)
- **Setup time:** 2-3 hours
- **Complexity:** Medium

### Option 2: MongoDB + Mongoose
**Best for:** Flexible schemas, rapid development
- **Database:** MongoDB
- **ODM:** Mongoose
- **Setup time:** 2-3 hours
- **Complexity:** Low-Medium

### Option 3: Supabase (PostgreSQL + Auth + Real-time)
**Best for:** Quick setup with built-in auth, real-time features
- **Database:** PostgreSQL
- **Features:** Authentication, real-time updates, file storage
- **Setup time:** 1-2 hours
- **Complexity:** Low

## Step-by-Step Implementation (PostgreSQL + Prisma)

### Phase 1: Add Database Dependencies
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

### Phase 2: Create Prisma Schema
Define your data models in `prisma/schema.prisma`:
- Student
- Program
- Course
- Class
- Teacher
- ProgramEnrollment
- CourseHistory
- WaitlistEntry

### Phase 3: Create API Routes
Create Next.js API routes in `app/api/`:
- `/api/students` - CRUD operations
- `/api/programs` - Program management
- `/api/classes` - Class management
- `/api/enrollments` - Program enrollments
- `/api/courses` - Course management
- `/api/teachers` - Teacher management

### Phase 4: Migrate Hooks to API Calls
Convert `lib/hooks/` from localStorage to API calls:
- `useStudents()` → fetch from `/api/students`
- `usePrograms()` → fetch from `/api/programs`
- `useClasses()` → fetch from `/api/classes`
- `useCourses()` → fetch from `/api/courses`
- `useTeachers()` → fetch from `/api/teachers`

### Phase 5: Environment Configuration
Create `.env.local`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/academy_enrollment"
NODE_ENV="production"
```

### Phase 6: Deploy to Coolify
1. Set up PostgreSQL database in Coolify
2. Add DATABASE_URL environment variable
3. Connect GitHub repository
4. Deploy with `npm run build && npm start`

## Deployment Checklist

- [ ] Choose database backend (PostgreSQL recommended)
- [ ] Set up database service
- [ ] Install database client/ORM
- [ ] Create database schema/models
- [ ] Create API routes for each resource
- [ ] Update hooks to use API calls
- [ ] Add environment variables
- [ ] Test locally with database
- [ ] Build and verify production build
- [ ] Deploy to Coolify
- [ ] Run database migrations on production
- [ ] Migrate existing localStorage data (optional)

## Important Considerations

### Data Migration
If you want to preserve existing localStorage data, you'll need to:
1. Export localStorage data as JSON
2. Create a one-time migration script
3. Insert data into production database
4. Run once on deployment

### Authentication (Future)
Consider adding user authentication:
- NextAuth.js for session management
- Role-based access (staff vs admin)
- Student parent portals

### Backups
- Set up automated PostgreSQL backups in Coolify
- Regular export of critical data

### Scalability
- Implement pagination for large datasets
- Add database indexes on frequently queried fields
- Consider caching with Redis for performance

## Quick Start: Recommended Path

1. **Today:** Set up PostgreSQL locally
2. **This week:** Implement Prisma schema and API routes
3. **Next week:** Migrate hooks to API calls
4. **Before deployment:** Test with production data volume
5. **Final step:** Deploy to Coolify with database

## Alternatives

### If you want to stay with localStorage temporarily:
- Use a simple JSON file-based database (like `better-sqlite3`)
- Implement in-memory caching with Node.js
- Export/import CSV for backups

### If you want managed database:
- **Supabase:** PostgreSQL hosting + real-time
- **Railway:** Easy PostgreSQL deployment
- **Render:** PostgreSQL with backups included

## Questions?

Key decisions to make:
1. **Which database?** PostgreSQL (recommended) or MongoDB?
2. **When to migrate data?** Fresh start or migrate localStorage?
3. **Need authentication?** Students/parents login or staff-only?
4. **Scale expectations?** Small academy (100s of students) or large (1000s)?
