import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Seeding database with test data...');

  // Create initial superadmin user
  console.log('Creating superadmin user...');
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@9jacodekids.com' },
    });

    if (!existingAdmin) {
      const hashedPassword = await hashPassword('Admin@123');
      await prisma.user.create({
        data: {
          email: 'admin@9jacodekids.com',
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPERADMIN',
          isActive: true,
        },
      });
      console.log('✅ Superadmin user created: admin@9jacodekids.com (password: Admin@123)');
    } else {
      console.log('ℹ️  Superadmin user already exists');
    }
  } catch (error) {
    console.error('Error creating superadmin:', error);
  }

  // Create Teachers (skip if they exist)
  console.log('Creating teachers...');
  let teacher1 = await prisma.teacher.findUnique({
    where: { email: 'alice@transcendai.com' },
  });

  if (!teacher1) {
    teacher1 = await prisma.teacher.create({
      data: {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@transcendai.com',
        phone: '+1-234-567-8900',
        status: 'ACTIVE',
        qualifiedCourses: ['Python Basics', 'Web Development'],
      },
    });
  }

  let teacher2 = await prisma.teacher.findUnique({
    where: { email: 'bob@transcendai.com' },
  });

  if (!teacher2) {
    teacher2 = await prisma.teacher.create({
      data: {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@transcendai.com',
        phone: '+1-234-567-8901',
        status: 'ACTIVE',
        qualifiedCourses: ['Game Design', 'Robotics'],
      },
    });
  }

  // Create Courses
  console.log('Creating courses...');
  const course1 = await prisma.course.create({
    data: {
      name: 'Python Basics',
      description: 'Introduction to Python programming',
      programLevels: ['CREATORS', 'INNOVATORS'],
    },
  });

  const course2 = await prisma.course.create({
    data: {
      name: 'Web Development',
      description: 'Build web applications with HTML, CSS, and JavaScript',
      programLevels: ['INNOVATORS', 'INVENTORS'],
    },
  });

  const course3 = await prisma.course.create({
    data: {
      name: 'Game Design',
      description: 'Learn game design principles and Scratch',
      programLevels: ['CREATORS'],
    },
  });

  // Create Programs
  console.log('Creating programs...');
  const program1 = await prisma.program.create({
    data: {
      name: 'January Weekend Code Club 2025',
      season: 'JANUARY',
      year: 2025,
      type: 'WEEKEND_CLUB',
      batches: 1,
      slots: ['Saturday 10am-12pm'],
      startDate: new Date('2025-01-01'),
    },
  });

  const program2 = await prisma.program.create({
    data: {
      name: 'Summer Holiday Code Camp 2025',
      season: 'SUMMER',
      year: 2025,
      type: 'HOLIDAY_CAMP',
      batches: 2,
      slots: ['Morning 9am-11am', 'Afternoon 1pm-3pm'],
      startDate: new Date('2025-06-01'),
    },
  });

  // Create Classes
  console.log('Creating classes...');
  const class1 = await prisma.class.create({
    data: {
      name: 'Python Basics - Batch 1',
      capacity: 15,
      batch: 1,
      slot: 'Saturday 10am-12pm',
      schedule: '{"days":["Saturday"],"time":"10:00-12:00"}',
      programLevel: 'CREATORS',
      courseId: course1.id,
      programId: program1.id,
      teacherId: teacher1.id,
      meetLink: null,
      isArchived: false,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      name: 'Game Design - Morning',
      capacity: 12,
      batch: 1,
      slot: 'Morning 9am-11am',
      schedule: '{"days":["Monday","Tuesday","Wednesday","Thursday","Friday"],"time":"09:00-11:00"}',
      programLevel: 'CREATORS',
      courseId: course3.id,
      programId: program2.id,
      teacherId: teacher2.id,
      meetLink: null,
      isArchived: false,
    },
  });

  const class3 = await prisma.class.create({
    data: {
      name: 'Web Development - Afternoon',
      capacity: 18,
      batch: 2,
      slot: 'Afternoon 1pm-3pm',
      schedule: '{"days":["Monday","Tuesday","Wednesday","Thursday","Friday"],"time":"13:00-15:00"}',
      programLevel: 'INNOVATORS',
      courseId: course2.id,
      programId: program2.id,
      teacherId: teacher1.id,
      meetLink: null,
      isArchived: false,
    },
  });

  // Create Students
  console.log('Creating students...');
  const student1 = await prisma.student.create({
    data: {
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'info@9jacodekids.com',
      phone: '+1-234-567-0001',
      parentEmail: 'sales@9jacodekids.com',
      dateOfBirth: new Date('2010-05-15'),
      isReturningStudent: false,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      firstName: 'Liam',
      lastName: 'Anderson',
      email: 'hello@9jacodekids.com',
      phone: '+1-234-567-0002',
      parentEmail: 'admin@skillsrave.com',
      dateOfBirth: new Date('2009-08-22'),
      isReturningStudent: true,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      firstName: 'Sophia',
      lastName: 'Taylor',
      email: 'hello@skillsrave.com',
      phone: '+1-234-567-0003',
      parentEmail: 'info@9jacodekids.com',
      dateOfBirth: new Date('2010-02-10'),
      isReturningStudent: false,
    },
  });

  const student4 = await prisma.student.create({
    data: {
      firstName: 'Noah',
      lastName: 'Brown',
      email: 'sales@9jacodekids.com',
      phone: '+1-234-567-0004',
      parentEmail: 'hello@9jacodekids.com',
      dateOfBirth: new Date('2011-03-18'),
      isReturningStudent: false,
    },
  });

  const student5 = await prisma.student.create({
    data: {
      firstName: 'Olivia',
      lastName: 'Davis',
      email: 'admin@9jacodekids.com',
      phone: '+1-234-567-0005',
      parentEmail: 'hello@skillsrave.com',
      dateOfBirth: new Date('2010-11-05'),
      isReturningStudent: false,
    },
  });

  // Create Program Enrollments
  console.log('Creating program enrollments...');

  // Assigned enrollments
  await prisma.programEnrollment.create({
    data: {
      studentId: student1.id,
      programId: program1.id,
      classId: class1.id,
      status: 'ASSIGNED',
      paymentStatus: 'CONFIRMED',
      priceType: 'FULL_PRICE',
      priceAmount: 60000,
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student2.id,
      programId: program1.id,
      classId: class1.id,
      status: 'ASSIGNED',
      paymentStatus: 'CONFIRMED',
      priceType: 'SIBLING_DISCOUNT',
      priceAmount: 56000,
    },
  });

  // Waitlist enrollments
  await prisma.programEnrollment.create({
    data: {
      studentId: student3.id,
      programId: program1.id,
      classId: null,
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
      priceType: 'FULL_PRICE',
      priceAmount: 60000,
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student4.id,
      programId: program1.id,
      classId: null,
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
      priceType: 'EARLY_BIRD',
      priceAmount: 54000,
    },
  });

  // Summer program enrollments
  await prisma.programEnrollment.create({
    data: {
      studentId: student1.id,
      programId: program2.id,
      classId: class2.id,
      status: 'ASSIGNED',
      paymentStatus: 'CONFIRMED',
      priceType: 'FULL_PRICE',
      priceAmount: 60000,
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student5.id,
      programId: program2.id,
      classId: null,
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
      priceType: 'FULL_PRICE',
      priceAmount: 60000,
    },
  });

  // Seed default pricing configuration
  console.log('Setting up pricing configuration...');
  await prisma.pricingConfig.upsert({
    where: { priceType: 'FULL_PRICE' },
    update: { amount: 60000 },
    create: { priceType: 'FULL_PRICE', amount: 60000 },
  });

  await prisma.pricingConfig.upsert({
    where: { priceType: 'SIBLING_DISCOUNT' },
    update: { amount: 56000 },
    create: { priceType: 'SIBLING_DISCOUNT', amount: 56000 },
  });

  await prisma.pricingConfig.upsert({
    where: { priceType: 'EARLY_BIRD' },
    update: { amount: 54000 },
    create: { priceType: 'EARLY_BIRD', amount: 54000 },
  });

  // Create Course History
  console.log('Creating course history...');
  await prisma.courseHistory.create({
    data: {
      studentId: student1.id,
      courseId: course1.id,
      courseName: 'Python Basics',
      programId: program1.id,
      programName: 'January Weekend Code Club 2025',
      batch: 1,
      year: 2025,
      completionStatus: 'COMPLETED',
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-01-29'),
      performanceNotes: 'Excellent progress. Mastered all fundamental concepts.',
    },
  });

  await prisma.courseHistory.create({
    data: {
      studentId: student2.id,
      courseId: course1.id,
      courseName: 'Python Basics',
      programId: program1.id,
      programName: 'January Weekend Code Club 2025',
      batch: 1,
      year: 2025,
      completionStatus: 'IN_PROGRESS',
      startDate: new Date('2024-01-08'),
      endDate: null,
      performanceNotes: 'Strong understanding of loops and conditionals.',
    },
  });

  await prisma.courseHistory.create({
    data: {
      studentId: student1.id,
      courseId: course3.id,
      courseName: 'Game Design',
      programId: program2.id,
      programName: 'Summer Holiday Code Camp 2025',
      batch: 1,
      year: 2025,
      completionStatus: 'COMPLETED',
      startDate: new Date('2024-06-03'),
      endDate: new Date('2024-08-16'),
      performanceNotes: 'Exceptional creativity and problem-solving skills.',
    },
  });

  console.log('Database seeded successfully!');
  console.log(`
✅ Created:
  - 1 Superadmin User (admin@9jacodekids.com)
  - 2 Teachers
  - 3 Courses
  - 2 Programs
  - 3 Classes
  - 5 Students
  - 6 Program Enrollments (2 assigned, 4 waitlist)
  - 3 Course History Records
  - 3 Pricing Configurations (Full Price: ₦60,000 | Sibling: ₦56,000 | Early Bird: ₦54,000)

📝 Test Credentials:
  Email: admin@9jacodekids.com
  Password: Admin@123

You can now start using the application with test data.
  `);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
