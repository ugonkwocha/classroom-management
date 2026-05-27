import type { ProgramLevel, ProgramLevelSetting } from '@/types';

export const PROGRAM_LEVELS: ProgramLevel[] = ['CREATORS', 'INNOVATORS', 'INVENTORS'];

export const DEFAULT_PROGRAM_LEVEL_SETTINGS: ProgramLevelSetting[] = [
  {
    level: 'CREATORS',
    displayName: 'Creators',
    ageRange: 'Ages 6-8',
    description: 'Entry-level coding and creative technology courses for younger learners.',
    sortOrder: 1,
  },
  {
    level: 'INNOVATORS',
    displayName: 'Innovators',
    ageRange: 'Ages 9-11',
    description: 'Intermediate courses for learners building stronger programming foundations.',
    sortOrder: 2,
  },
  {
    level: 'INVENTORS',
    displayName: 'Inventors',
    ageRange: 'Ages 12-16',
    description: 'Advanced project-based courses for older learners and teen builders.',
    sortOrder: 3,
  },
];

export function mergeProgramLevelSettings(settings: ProgramLevelSetting[] = []) {
  return DEFAULT_PROGRAM_LEVEL_SETTINGS.map((fallback) => {
    const saved = settings.find((setting) => setting.level === fallback.level);
    return {
      ...fallback,
      ...saved,
      displayName: saved?.displayName?.trim() || fallback.displayName,
      ageRange: saved?.ageRange?.trim() || fallback.ageRange,
      description: saved?.description?.trim() || fallback.description,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProgramLevelSetting(
  settings: ProgramLevelSetting[] | undefined,
  level: ProgramLevel | string
) {
  const merged = mergeProgramLevelSettings(settings);
  return merged.find((setting) => setting.level === level) || {
    level: level as ProgramLevel,
    displayName: String(level),
    ageRange: '',
    description: '',
    sortOrder: 99,
  };
}

export function getProgramLevelLabel(settings: ProgramLevelSetting[] | undefined, level: ProgramLevel | string) {
  return getProgramLevelSetting(settings, level).displayName;
}

export function formatProgramLevelList(settings: ProgramLevelSetting[] | undefined, levels: ProgramLevel[]) {
  return levels.map((level) => getProgramLevelLabel(settings, level)).join(', ');
}
