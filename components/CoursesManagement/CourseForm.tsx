'use client';

import { useState } from 'react';
import { Course, ProgramLevel } from '@/types';
import { Input, Button } from '@/components/ui';

interface CourseFormProps {
  onSubmit: (course: Omit<Course, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: Course;
  isLoading?: boolean;
}

const allProgramLevels: ProgramLevel[] = ['CREATORS', 'INNOVATORS', 'INVENTORS'];

const programLevelInfo = {
  'CREATORS': 'Ages 6-8',
  'INNOVATORS': 'Ages 9-11',
  'INVENTORS': 'Ages 12-16',
};

export function CourseForm({ onSubmit, onCancel, initialData, isLoading = false }: CourseFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    programLevels: initialData?.programLevels || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Course name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.programLevels.length === 0) newErrors.programLevels = 'At least one program level is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: formData.name,
      description: formData.description,
      programLevels: formData.programLevels,
    });

    setFormData({
      name: '',
      description: '',
      programLevels: [],
    });
    setErrors({});
  };

  const toggleProgramLevel = (level: ProgramLevel) => {
    setFormData({
      ...formData,
      programLevels: formData.programLevels.includes(level)
        ? formData.programLevels.filter((l) => l !== level)
        : [...formData.programLevels, level],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Course Name"
        type="text"
        placeholder="e.g., App Development 101, Web Design Basics"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Input
        label="Description"
        type="text"
        placeholder="Brief description of the course"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        error={errors.description}
      />

      <div>
        <label className="mb-3 block text-sm font-bold text-slate-700">
          Available for Program Levels
        </label>
        <div className="space-y-2">
          {allProgramLevels.map((level) => (
            <label
              key={level}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                formData.programLevels.includes(level)
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.programLevels.includes(level)}
                onChange={() => toggleProgramLevel(level)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="font-bold text-slate-950">{level}</p>
                <p className="text-xs text-slate-500">{programLevelInfo[level]}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.programLevels && (
          <p className="mt-2 text-sm font-medium text-rose-600">{errors.programLevels}</p>
        )}
        <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium leading-5 text-blue-800">
          Select multiple levels if this course can be taught to different age groups. Classes will still be separated by age and instructor.
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {initialData ? 'Update Course' : 'Create Course'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
