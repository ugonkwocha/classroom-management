'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import { useCourses } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { Course, ProgramLevel } from '@/types';
import { FiBookOpen, FiEdit3, FiLayers, FiTarget, FiUsers } from 'react-icons/fi';

const programLevels: ProgramLevel[] = ['CREATORS', 'INNOVATORS', 'INVENTORS'];

const levelMeta: Record<ProgramLevel, { label: string; ageRange: string; description: string; accent: string }> = {
  CREATORS: {
    label: 'Creators',
    ageRange: 'Ages 6-8',
    description: 'Entry-level coding and creative technology courses for younger learners.',
    accent: 'bg-emerald-50 text-emerald-600',
  },
  INNOVATORS: {
    label: 'Innovators',
    ageRange: 'Ages 9-11',
    description: 'Intermediate courses for learners building stronger programming foundations.',
    accent: 'bg-blue-50 text-blue-600',
  },
  INVENTORS: {
    label: 'Inventors',
    ageRange: 'Ages 12-16',
    description: 'Advanced project-based courses for older learners and teen builders.',
    accent: 'bg-amber-50 text-amber-600',
  },
};

function sortLevels(levels: ProgramLevel[]) {
  return programLevels.filter((level) => levels.includes(level));
}

export function ProgramLevelsManagement() {
  const { courses, isLoaded, updateCourse } = useCourses();
  const { hasPermission } = useAuth();
  const [editingLevel, setEditingLevel] = useState<ProgramLevel | undefined>();
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = hasPermission(PERMISSIONS.UPDATE_COURSE);

  const coursesByLevel = useMemo(() => {
    return programLevels.reduce<Record<ProgramLevel, Course[]>>((acc, level) => {
      acc[level] = courses.filter((course) => course.programLevels.includes(level));
      return acc;
    }, {
      CREATORS: [],
      INNOVATORS: [],
      INVENTORS: [],
    });
  }, [courses]);

  const handleOpenEditor = (level: ProgramLevel) => {
    setEditingLevel(level);
    setSelectedCourseIds(coursesByLevel[level].map((course) => course.id));
    setError('');
  };

  const handleCloseEditor = () => {
    setEditingLevel(undefined);
    setSelectedCourseIds([]);
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

  if (!isLoaded) {
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
          <p className="mt-1 text-3xl font-bold text-slate-950">{programLevels.length}</p>
        </div>
        {programLevels.map((level) => {
          const meta = levelMeta[level];
          return (
            <div key={level} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${meta.accent}`}>
                <FiTarget className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-500">{meta.label}</p>
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
          {programLevels.map((level) => {
            const meta = levelMeta[level];
            const levelCourses = coursesByLevel[level];
            return (
              <article key={level} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${meta.accent}`}>
                      <FiUsers className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{meta.label}</h3>
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
        title={editingLevel ? `Edit ${levelMeta[editingLevel].label}` : 'Edit Program Level'}
      >
        {editingLevel && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">
                Select the courses available for {levelMeta[editingLevel].label}.
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Course names stay in the Courses tab. This tab controls level availability.
              </p>
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
                            {level}
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
