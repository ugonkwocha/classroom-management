import prisma from '@/lib/prisma';

export async function getTutorClassRoster(classId: string) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: true,
      program: true,
      teacher: true,
      enrollments: {
        where: { status: 'ASSIGNED' },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!classData) return null;

  const studentsById = new Map(
    classData.enrollments.map(({ student }) => [
      student.id,
      `${student.firstName} ${student.lastName}`.trim(),
    ])
  );
  const studentNames = Array.from(studentsById.values()).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' })
  );

  return { classData, studentNames };
}
