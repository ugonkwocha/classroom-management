import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with test data...');

  // Create Teachers
  console.log('Creating teachers...');
  const teacher1 = await prisma.teacher.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@transcendai.com',
      phone: '+1-234-567-8900',
      status: 'ACTIVE',
      qualifiedCourses: ['Python Basics', 'Web Development'],
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@transcendai.com',
      phone: '+1-234-567-8901',
      status: 'ACTIVE',
      qualifiedCourses: ['Game Design', 'Robotics'],
    },
  });

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
    },
  });

  const program2 = await prisma.program.create({
    data: {
      name: 'Summer Holiday Code Camp 2025',
      season: 'SUMMER',
      year: 2025,
      type: 'HOLIDAY_CAMP',
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
      teacherId: teacher1.id,
      courseId: course1.id,
      programId: program1.id,
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
      teacherId: teacher2.id,
      courseId: course3.id,
      programId: program2.id,
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
      teacherId: teacher1.id,
      courseId: course2.id,
      programId: program2.id,
      isArchived: false,
    },
  });

  // Create Students
  console.log('Creating students...');
  const student1 = await prisma.student.create({
    data: {
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@email.com',
      dateOfBirth: new Date('2010-05-15'),
      isReturningStudent: false,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      firstName: 'Liam',
      lastName: 'Anderson',
      email: 'liam.anderson@email.com',
      dateOfBirth: new Date('2009-08-22'),
      isReturningStudent: true,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      firstName: 'Sophia',
      lastName: 'Taylor',
      email: 'sophia.taylor@email.com',
      dateOfBirth: new Date('2010-02-10'),
      isReturningStudent: false,
    },
  });

  const student4 = await prisma.student.create({
    data: {
      firstName: 'Noah',
      lastName: 'Brown',
      email: 'noah.brown@email.com',
      dateOfBirth: new Date('2011-03-18'),
      isReturningStudent: false,
    },
  });

  const student5 = await prisma.student.create({
    data: {
      firstName: 'Olivia',
      lastName: 'Davis',
      email: 'olivia.davis@email.com',
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
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student2.id,
      programId: program1.id,
      classId: class1.id,
      status: 'ASSIGNED',
      paymentStatus: 'CONFIRMED',
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
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student4.id,
      programId: program1.id,
      classId: null,
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
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
    },
  });

  await prisma.programEnrollment.create({
    data: {
      studentId: student5.id,
      programId: program2.id,
      classId: null,
      status: 'WAITLIST',
      paymentStatus: 'PENDING',
    },
  });

  // Create Course History
  console.log('Creating course history...');
  await prisma.courseHistory.create({
    data: {
      studentId: student1.id,
      courseName: 'Python Basics',
      completionStatus: 'COMPLETED',
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-01-29'),
      performanceNotes: 'Excellent progress. Mastered all fundamental concepts.',
    },
  });

  await prisma.courseHistory.create({
    data: {
      studentId: student2.id,
      courseName: 'Python Basics',
      completionStatus: 'IN_PROGRESS',
      startDate: new Date('2024-01-08'),
      endDate: null,
      performanceNotes: 'Strong understanding of loops and conditionals.',
    },
  });

  await prisma.courseHistory.create({
    data: {
      studentId: student1.id,
      courseName: 'Game Design',
      completionStatus: 'COMPLETED',
      startDate: new Date('2024-06-03'),
      endDate: new Date('2024-08-16'),
      performanceNotes: 'Exceptional creativity and problem-solving skills.',
    },
  });

  console.log('Database seeded successfully!');
  console.log(`
✅ Created:
  - 2 Teachers
  - 3 Courses
  - 2 Programs
  - 3 Classes
  - 5 Students
  - 6 Program Enrollments (2 assigned, 4 waitlist)
  - 3 Course History Records

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
