'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import { useCourses, useProgramLevelSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { Course, ProgramLevel } from '@/types';
import { PROGRAM_LEVELS, getProgramLevelLabel, getProgramLevelSetting } from '@/lib/program-levels';
import { FiBookOpen, FiEdit3, FiLayers, FiTarget, FiUsers } from 'react-icons/fi';

const levelAccents: Record<ProgramLevel, string> = {
  CREATORS: 'bg-emerald-50 text-emerald-600',
  INNOVATORS: 'bg-blue-50 text-blue-600',
  INVENTORS: 'bg-amber-50 text-amber-600',
};

const defaultLevelNames: Record<ProgramLevel, string> = {
  CREATORS: 'Creators',
  INNOVATORS: 'Innovators',
  INVENTORS: 'Inventors',
};

function sortLevels(levels: ProgramLevel[]) {
  return PROGRAM_LEVELS.filter((level) => levels.includes(level));
}

export function ProgramLevelsManagement() {
  const { courses, isLoaded, updateCourse } = useCourses();
  const { settings, isLoaded: settingsLoaded, updateProgramLevelSetting } = useProgramLevelSettings();
  const { hasPermission } = useAuth();
  const [editingLevel, setEditingLevel] = useState<ProgramLevel | undefined>();
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [levelForm, setLevelForm] = useState({ displayName: '', ageRange: '', description: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = hasPermission(PERMISSIONS.UPDATE_COURSE);

  const coursesByLevel = useMemo(() => {
    return PROGRAM_LEVELS.reduce<Record<ProgramLevel, Course[]>>((acc, level) => {
      acc[level] = courses.filter((course) => course.programLevels.includes(level));
      return acc;
    }, {
      CREATORS: [],
      INNOVATORS: [],
      INVENTORS: [],
    });
  }, [courses]);

  const handleOpenEditor = (level: ProgramLevel) => {
    const setting = getProgramLevelSetting(settings, level);
    setEditingLevel(level);
    setSelectedCourseIds(coursesByLevel[level].map((course) => course.id));
    setLevelForm({
      displayName: setting.displayName,
      ageRange: setting.ageRange || '',
      description: setting.description || '',
    });
    setError('');
  };

  const handleCloseEditor = () => {
    setEditingLevel(undefined);
    setSelectedCourseIds([]);
    setLevelForm({ displayName: '', ageRange: '', description: '' });
    setError('');
    setIsSaving(false);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((currentIds) =>
      currentIds.includes(courseId)
        ? currentIds.filter((id) => id !== courseId)
        : [...currentIds, courseId]
    );
    setError('');
  };

  const handleSaveLevel = async () => {
    if (!editingLevel) return;

    try {
      setIsSaving(true);
      if (!levelForm.displayName.trim()) {
        throw new Error('Program level name is required.');
      }

      const selectedSet = new Set(selectedCourseIds);
      const courseUpdates = courses
        .map((course) => {
          const currentlyIncluded = course.programLevels.includes(editingLevel);
          const shouldInclude = selectedSet.has(course.id);

          if (currentlyIncluded === shouldInclude) return null;

          const nextLevels = shouldInclude
            ? sortLevels([...course.programLevels, editingLevel])
            : sortLevels(course.programLevels.filter((level) => level !== editingLevel));

          if (nextLevels.length === 0) {
            throw new Error(`${course.name} must remain assigned to at least one program level.`);
          }

          return {
            course,
            nextLevels,
          };
        })
        .filter(Boolean) as { course: Course; nextLevels: ProgramLevel[] }[];

      await updateProgramLevelSetting(editingLevel, {
        displayName: levelForm.displayName,
        ageRange: levelForm.ageRange,
        description: levelForm.description,
      });

      await Promise.all(
        courseUpdates.map(({ course, nextLevels }) =>
          updateCourse(course.id, {
            name: course.name,
            description: course.description,
            programLevels: nextLevels,
          })
        )
      );
      handleCloseEditor();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update program level.';
      setError(message);
      setIsSaving(false);
    }
  };

  if (!isLoaded || !settingsLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading program levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiLayers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Program Levels</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{PROGRAM_LEVELS.length}</p>
        </div>
        {PROGRAM_LEVELS.map((level) => {
          const meta = getProgramLevelSetting(settings, level);
          return (
            <div key={level} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${levelAccents[level]}`}>
                <FiTarget className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-500">{meta.displayName}</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{coursesByLevel[level].length}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{meta.ageRange}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">Program Level Directory</h2>
          <p className="mt-1 text-sm text-slate-500">Manage which courses are available for each academy level.</p>
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-3">
          {PROGRAM_LEVELS.map((level) => {
            const meta = getProgramLevelSetting(settings, level);
            const levelCourses = coursesByLevel[level];
            return (
              <article key={level} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${levelAccents[level]}`}>
                      <FiUsers className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{meta.displayName}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{meta.ageRange}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditor(level)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                    >
                      <FiEdit3 className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">{meta.description}</p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Courses</p>
                    <Badge variant="info">{levelCourses.length}</Badge>
                  </div>
                  {levelCourses.length > 0 ? (
                    <div className="space-y-2">
                      {levelCourses.map((course) => (
                        <div key={course.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-sm font-bold text-slate-900">{course.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{course.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-semibold text-slate-500">
                      No courses assigned yet.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Modal
        isOpen={!!editingLevel}
        onClose={handleCloseEditor}
        title={editingLevel ? `Edit ${getProgramLevelLabel(settings, editingLevel)}` : 'Edit Program Level'}
      >
        {editingLevel && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">
                Rename this program level and select the courses available for it.
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Internal records keep using {editingLevel}; this changes the display name across the app.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Program Level Name</span>
                <input
                  type="text"
                  value={levelForm.displayName}
                  onChange={(e) => setLevelForm((current) => ({ ...current, displayName: e.target.value }))}
                  placeholder={defaultLevelNames[editingLevel]}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Age Range</span>
                <input
                  type="text"
                  value={levelForm.ageRange}
                  onChange={(e) => setLevelForm((current) => ({ ...current, ageRange: e.target.value }))}
                  placeholder="Ages 6-8"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Description</span>
                <textarea
                  value={levelForm.description}
                  onChange={(e) => setLevelForm((current) => ({ ...current, description: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <label
                    key={course.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                      selectedCourseIds.includes(course.id)
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-950">{course.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{course.description}</span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {course.programLevels.map((level) => (
                          <Badge key={level} variant={level === editingLevel ? 'primary' : 'info'}>
                            {getProgramLevelLabel(settings, level)}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <FiBookOpen className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-500">Create courses before assigning program levels.</p>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="primary" className="flex-1" onClick={handleSaveLevel} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Level'}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={handleCloseEditor} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
