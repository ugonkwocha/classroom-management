import { Class } from '@/types';
import { extractClassInfo, formatClassName } from '@/lib/utils';

export interface MigrationResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ classId: string; className: string; error: string }>;
}

export function migrateClassNamesToNewFormat(
  classes: Class[],
  programs: Array<{ id: string; name: string; season: string; year: number }>
): { updatedClasses: Class[]; result: MigrationResult } {
  const result: MigrationResult = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const programMap = new Map(programs.map(p => [p.id, p]));

  const updatedClasses = classes.map((classItem) => {
    try {
      // Check if class name is already in new format (contains year)
      // New format: "CourseName - Mon/Tue/Wed/etc - Batch X - Slot"
      // Old format: "CourseName - January/February/etc - Batch X - Slot"

      const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const hasNewFormat = shortDays.some(day => classItem.name.includes(` - ${day}`));

      if (hasNewFormat) {
        result.skipped++;
        return classItem;
      }

      // Extract old format info
      const classInfo = extractClassInfo(classItem.name);
      if (!classInfo) {
        result.failed++;
        result.errors.push({
          classId: classItem.id,
          className: classItem.name,
          error: 'Could not parse class name format',
        });
        return classItem;
      }

      // Get program info to get the year
      const program = programMap.get(classItem.programId);
      if (!program) {
        result.failed++;
        result.errors.push({
          classId: classItem.id,
          className: classItem.name,
          error: `Program with ID ${classItem.programId} not found`,
        });
        return classItem;
      }

      // Generate new format name
      const newBaseName = formatClassName(
        classInfo.courseName,
        program.season,
        program.year,
        classInfo.batch,
        classInfo.slot
      );

      // Add suffix if it exists
      const newName = classInfo.suffix ? `${newBaseName}${classInfo.suffix}` : newBaseName;

      result.successful++;
      return {
        ...classItem,
        name: newName,
      };
    } catch (error) {
      result.failed++;
      result.errors.push({
        classId: classItem.id,
        className: classItem.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return classItem;
    }
  });

  return { updatedClasses, result };
}
