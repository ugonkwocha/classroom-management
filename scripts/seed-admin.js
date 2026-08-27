#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@9jacodekids.com';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SEED_ADMIN_LAST_NAME || 'Admin';

  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SEED_ADMIN_PASSWORD must be set when seeding in production.');
    }

    console.warn('SEED_ADMIN_PASSWORD is not set. Using a development-only default password.');
  }

  console.log(`Ensuring superadmin exists: ${email}`);

  const passwordHash = await bcrypt.hash(password || 'Admin@123', 10);

  await prisma.role.createMany({
    data: [
      { slug: 'superadmin', label: 'Super Admin' },
      { slug: 'admin', label: 'Admin' },
      { slug: 'staff', label: 'Staff' },
      { slug: 'parent', label: 'Parent' },
      { slug: 'tutor', label: 'Tutor' },
      { slug: 'student', label: 'Student' },
    ],
    skipDuplicates: true,
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      firstName,
      lastName,
      role: 'SUPERADMIN',
      isActive: true,
    },
    create: {
      email,
      password: passwordHash,
      firstName,
      lastName,
      role: 'SUPERADMIN',
      isActive: true,
    },
  });

  await prisma.userRoleAssignment.deleteMany({
    where: {
      userId: user.id,
      roleSlug: { in: ['admin', 'staff'] },
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleSlug: {
        userId: user.id,
        roleSlug: 'superadmin',
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleSlug: 'superadmin',
    },
  });

  console.log('Superadmin is ready.');
}

main()
  .catch((error) => {
    console.error('Failed to seed superadmin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
