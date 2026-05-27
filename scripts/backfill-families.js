#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const normalizeEmail = (value) => (value || '').trim().toLowerCase();
const normalizePhone = (value) => (value || '').replace(/\D/g, '');
const contactKeysForStudent = (student) => {
  const keys = [];
  const email = normalizeEmail(student.parentEmail);
  if (email) keys.push(`email:${email}`);

  const phone = normalizePhone(student.parentPhone);
  if (phone) keys.push(`phone:${student.parentPhoneCountryCode || 'NG'}:${phone}`);

  return keys;
};

async function findOrCreateFamilyForGroup(students) {
  const linkedFamily = students.find((student) => student.familyId)?.familyId;
  if (linkedFamily) return linkedFamily;

  const firstStudent = students[0];
  const displayName = `${firstStudent.lastName || 'Student'} Family`;

  const family = await prisma.family.create({
    data: { displayName },
  });

  return family.id;
}

async function ensurePrimaryGuardian(familyId, student) {
  const email = normalizeEmail(student.parentEmail);
  const phone = normalizePhone(student.parentPhone);
  const countryCode = student.parentPhoneCountryCode || 'NG';

  const existing = await prisma.parentGuardian.findFirst({
    where: {
      familyId,
      OR: [
        ...(email ? [{ emailNormalized: email }] : []),
        ...(phone ? [{ phoneNormalized: phone, phoneCountryCode: countryCode }] : []),
      ],
    },
  });

  if (existing) {
    if (!existing.isPrimary) {
      const primary = await prisma.parentGuardian.findFirst({
        where: { familyId, isPrimary: true },
      });
      if (!primary) {
        await prisma.parentGuardian.update({
          where: { id: existing.id },
          data: { isPrimary: true },
        });
      }
    }
    return existing.id;
  }

  const hasPrimary = await prisma.parentGuardian.findFirst({
    where: { familyId, isPrimary: true },
  });

  const guardian = await prisma.parentGuardian.create({
    data: {
      familyId,
      firstName: 'Parent',
      lastName: 'Guardian',
      email: student.parentEmail || null,
      emailNormalized: email || null,
      phone: student.parentPhone || null,
      phoneNormalized: phone || null,
      phoneCountryCode: student.parentPhone ? countryCode : null,
      relationship: 'PARENT',
      isPrimary: !hasPrimary,
      isActive: true,
      needsReview: true,
    },
  });

  return guardian.id;
}

async function backfillFamilies() {
  console.log('Starting family backfill...');

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { familyId: null },
        { familyId: { not: null } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const parent = new Map();
  const studentById = new Map(students.map((student) => [student.id, student]));
  const keyOwner = new Map();

  const find = (id) => {
    if (!parent.has(id)) parent.set(id, id);
    const current = parent.get(id);
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const student of students) {
    const keys = contactKeysForStudent(student);
    if (keys.length === 0) continue;

    find(student.id);
    for (const key of keys) {
      const existingOwner = keyOwner.get(key);
      if (existingOwner) {
        union(existingOwner, student.id);
      } else {
        keyOwner.set(key, student.id);
      }
    }
  }

  const groups = new Map();
  for (const studentId of parent.keys()) {
    const root = find(studentId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(studentById.get(studentId));
  }

  let linkedStudents = 0;
  let createdOrEnsuredGroups = 0;

  for (const groupStudents of groups.values()) {
    const familyId = await findOrCreateFamilyForGroup(groupStudents);
    await ensurePrimaryGuardian(familyId, groupStudents[0]);

    for (const student of groupStudents) {
      if (student.familyId !== familyId) {
        await prisma.student.update({
          where: { id: student.id },
          data: { familyId },
        });
        linkedStudents += 1;
      }
    }

    createdOrEnsuredGroups += 1;
  }

  console.log(`Family backfill complete. Groups processed: ${createdOrEnsuredGroups}. Students linked: ${linkedStudents}.`);
}

backfillFamilies()
  .catch((error) => {
    console.error('Family backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
