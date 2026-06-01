export const MISSING_PREPARATION_TEMPLATE_ERROR =
  'This course needs an active preparation email template before students can be assigned. Create or activate the template in Email Templates.';

type PrismaLike = {
  class: {
    findUnique: (args: any) => Promise<any>;
  };
};

export async function ensureClassHasActivePreparationTemplate(prismaClient: PrismaLike, classId: string) {
  const classData = await prismaClient.class.findUnique({
    where: { id: classId },
    include: {
      course: {
        include: {
          emailTemplate: true,
        },
      },
    },
  });

  if (!classData) {
    throw new Error('Target class not found');
  }

  if (!classData.course.emailTemplate?.isActive) {
    throw new Error(MISSING_PREPARATION_TEMPLATE_ERROR);
  }

  return classData;
}
