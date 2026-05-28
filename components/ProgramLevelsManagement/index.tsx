'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import { useCourses, useProgramLevelSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { Course, ProgramLevel, ProgramLevelSetting } from '@/types';
import { getProgramLevelLabel, getProgramLevelSetting } from '@/lib/program-levels';
import { FiBookOpen, FiEdit3, FiLayers, FiPlus, FiTarget, FiUsers } from 'react-icons/fi';

const fallbackAccents = [
  'bg-emerald-50 text-emerald-600',
  'bg-blue-50 text-blue-600',
  'bg-amber-50 text-amber-600',
  'bg-violet-50 text-violet-600',
  'bg-rose-50 text-rose-600',
  'bg-cyan-50 text-cyan-600',
];

const fixedAccents: Record<string, string> = {
  CREATORS: 'bg-emerald-50 text-emerald-600',
  INNOVATORS: 'bg-blue-50 text-blue-600',
  INVENTORS: 'bg-amber-50 text-amber-600',
};

function levelAccent(level: string, index: number) {
  return fixedAccents[level] || fallbackAccents[index % fallbackAccents.length];
}

function sortLevels(levels: ProgramLevel[], settings: ProgramLevelSetting[]) {
  const knownLevels = settings.map((setting) => setting.level);
  const ordered = knownLevels.filter((level) => levels.includes(level));
  const unknown = levels.filter((level) => !knownLevels.includes(level)).sort();
  return [...ordered, ...unknown];
}

export function ProgramLevelsManagement() {
  const { courses, isLoaded, updateCourse } = useCourses();
  const {
    settings,
    isLoaded: settingsLoaded,
    addProgramLevelSetting,
    updateProgramLevelSetting,
  } = useProgramLevelSettings();
  const { hasPermission } = useAuth();
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | undefined>();
  const [editingLevel, setEditingLevel] = useState<ProgramLevel | undefined>();
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [levelForm, setLevelForm] = useState({ displayName: '', ageRange: '', description: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = hasPermission(PERMISSIONS.UPDATE_COURSE);
  const isEditorOpen = !!editorMode;

  const coursesByLevel = useMemo(() => {
    return settings.reduce<Record<string, Course[]>>((acc, setting) => {
      acc[setting.level] = courses.filter((course) => course.programLevels.includes(setting.level));
      return acc;
    }, {});
  }, [courses, settings]);

  const handleOpenCreate = () => {
    setEditorMode('create');
    setEditingLevel(undefined);
    setSelectedCourseIds([]);
    setLevelForm({ displayName: '', ageRange: '', description: '' });
    setError('');
  };

  const handleOpenEditor = (level: ProgramLevel) => {
    const setting = getProgramLevelSetting(settings, level);
    setEditorMode('edit');
    setEditingLevel(level);
    setSelectedCourseIds((coursesByLevel[level] || []).map((course) => course.id));
    setLevelForm({
      displayName: setting.displayName,
      ageRange: setting.ageRange || '',
      description: setting.description || '',
    });
    setError('');
  };

  const handleCloseEditor = () => {
    setEditorMode(undefined);
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
    try {
      setIsSaving(true);
      if (!levelForm.displayName.trim()) {
        throw new Error('Program level name is required.');
      }

      const selectedSet = new Set(selectedCourseIds);
      const savedSetting =
        editorMode === 'create'
          ? await addProgramLevelSetting({
              displayName: levelForm.displayName,
              ageRange: levelForm.ageRange,
              description: levelForm.description,
            })
          : editingLevel
          ? await updateProgramLevelSetting(editingLevel, {
              displayName: levelForm.displayName,
              ageRange: levelForm.ageRange,
              description: levelForm.description,
            })
          : undefined;

      if (!savedSetting) {
        throw new Error('Program level could not be saved.');
      }

      const levelToApply = savedSetting.level;
      const nextSettings =
        editorMode === 'create'
          ? [...settings, savedSetting].sort((a, b) => a.sortOrder - b.sortOrder)
          : settings;

      const courseUpdates = courses
        .map((course) => {
          const currentlyIncluded = course.programLevels.includes(levelToApply);
          const shouldInclude = selectedSet.has(course.id);

          if (currentlyIncluded === shouldInclude) return null;

          const nextLevels = shouldInclude
            ? sortLevels([...course.programLevels, levelToApply], nextSettings)
            : sortLevels(course.programLevels.filter((level) => level !== levelToApply), nextSettings);

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
      const message = saveError instanceof Error ? saveError.message : 'Failed to save program level.';
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
          <p className="mt-1 text-3xl font-bold text-slate-950">{settings.length}</p>
        </div>
        {settings.slice(0, 3).map((setting, index) => (
          <div key={setting.level} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${levelAccent(setting.level, index)}`}>
              <FiTarget className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-500">{setting.displayName}</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{(coursesByLevel[setting.level] || []).length}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{setting.ageRange || 'No age range set'}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Program Level Directory</h2>
            <p className="mt-1 text-sm text-slate-500">Add levels and manage which courses are available for each academy level.</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiPlus className="h-4 w-4" />
              Add Program Level
            </button>
          )}
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-3">
          {settings.map((setting, index) => {
            const levelCourses = coursesByLevel[setting.level] || [];
            return (
              <article key={setting.level} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${levelAccent(setting.level, index)}`}>
                      <FiUsers className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{setting.displayName}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{setting.ageRange || 'No age range set'}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditor(setting.level)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                    >
                      <FiEdit3 className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {setting.description || 'No description set for this program level yet.'}
                </p>

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
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        title={
          editorMode === 'create'
            ? 'Add Program Level'
            : editingLevel
            ? `Edit ${getProgramLevelLabel(settings, editingLevel)}`
            : 'Edit Program Level'
        }
      >
        {isEditorOpen && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">
                {editorMode === 'create'
                  ? 'Create a new program level and optionally assign courses to it.'
                  : 'Rename this program level and select the courses available for it.'}
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-800">
                Program levels are used when creating courses and classes.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Program Level Name</span>
                <input
                  type="text"
                  value={levelForm.displayName}
                  onChange={(e) => setLevelForm((current) => ({ ...current, displayName: e.target.value }))}
                  placeholder="e.g., Builders"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold text-slate-700">Age Range</span>
                <input
                  type="text"
                  value={levelForm.ageRange}
                  onChange={(e) => setLevelForm((current) => ({ ...current, ageRange: e.target.value }))}
                  placeholder="Ages 13-15"
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
                {isSaving ? 'Saving...' : editorMode === 'create' ? 'Create Level' : 'Save Level'}
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
