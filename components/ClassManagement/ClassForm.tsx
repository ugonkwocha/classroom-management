'use client';

import { useState, useMemo } from 'react';
import { Class, ProgramLevel } from '@/types';
import { Input, Select, Button } from '@/components/ui';
import { useCourses, usePrograms, useClasses, useTeachers } from '@/lib/hooks';

interface ClassFormProps {
  onSubmit: (classData: Omit<Class, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: Class;
  isLoading?: boolean;
}

export function ClassForm({ onSubmit, onCancel, initialData, isLoading = false }: ClassFormProps) {
  const { courses, isLoaded: coursesLoaded } = useCourses();
  const { programs, isLoaded: programsLoaded } = usePrograms();
  const { classes } = useClasses();
  const { teachers, isLoaded: teachersLoaded } = useTeachers();

  const [formData, setFormData] = useState({
    courseId: initialData?.courseId || '',
    programId: initialData?.programId || '',
    programLevel: initialData?.programLevel || '',
    batch: String(initialData?.batch || 1),
    slot: initialData?.slot || '',
    teacherId: initialData?.teacherId || '',
    capacity: initialData?.capacity || 6,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get selected course and program
  const selectedCourse = courses.find((c) => c.id === formData.courseId);
  const selectedProgram = programs.find((p) => p.id === formData.programId);

  // Filter batches based on selected program
  const batchOptions = useMemo(() => {
    if (!selectedProgram) return [];
    return Array.from({ length: selectedProgram.batches }, (_, i) => ({
      value: String(i + 1),
      label: `Batch ${i + 1}`,
    }));
  }, [selectedProgram]);

  // Filter slots based on selected program
  const slotOptions = useMemo(() => {
    if (!selectedProgram) return [];
    return selectedProgram.slots.map((slot) => ({
      value: slot,
      label: slot,
    }));
  }, [selectedProgram]);

  // Generate class name dynamically with suffix based on count of similar classes
  const generatedClassName = useMemo(() => {
    if (selectedCourse && selectedProgram && formData.batch && formData.slot) {
      const baseName = `${selectedCourse.name} - ${selectedProgram.season} - Batch ${formData.batch} - ${formData.slot}`;
      const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Find all existing classes with the same configuration (base name with or without suffix)
      const similarClasses = classes.filter((cls) => {
        if (initialData && cls.id === initialData.id) return false; // Exclude current class being edited
        // Match: exact base name OR base name with suffix like "-A", "-B", etc.
        return (
          cls.name === baseName ||
          cls.name.match(new RegExp(`^${escapedBaseName}-[A-Z]$`))
        );
      });

      // Extract existing suffixes from similar classes
      const existingSuffixes = new Set<string>();
      similarClasses.forEach((cls) => {
        const match = cls.name.match(new RegExp(`^${escapedBaseName}-([A-Z])$`));
        if (match) {
          existingSuffixes.add(match[1]);
        }
      });

      // Find the first available letter (A, B, C, etc.)
      let suffixIndex = 0;
      let suffixChar = String.fromCharCode(65 + suffixIndex); // Start with A
      while (existingSuffixes.has(suffixChar) && suffixIndex < 26) {
        suffixIndex++;
        suffixChar = String.fromCharCode(65 + suffixIndex);
      }

      if (suffixIndex >= 26) {
        console.warn('Too many classes with the same configuration (more than 26)');
        return baseName; // Fallback to base name if we run out of letters
      }

      const finalName = `${baseName}-${suffixChar}`;
      return finalName;
    }
    return '';
  }, [selectedCourse, selectedProgram, formData.batch, formData.slot, classes, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.courseId) newErrors.courseId = 'Course is required';
    if (!formData.programId) newErrors.programId = 'Program is required';
    if (!formData.programLevel) newErrors.programLevel = 'Program level is required';
    if (!formData.batch) newErrors.batch = 'Batch is required';
    if (!formData.slot) newErrors.slot = 'Time slot is required';
    if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
    if (formData.capacity > 50) newErrors.capacity = 'Capacity cannot exceed 50 students';
    if (!Number.isInteger(formData.capacity)) newErrors.capacity = 'Capacity must be a whole number';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!selectedCourse || !selectedProgram) {
      setErrors({ form: 'Please select a valid course and program' });
      return;
    }

    // Verify that the selected program level is available in the course
    if (!selectedCourse.programLevels.includes(formData.programLevel as ProgramLevel)) {
      setErrors({ form: 'The selected course is not available for this program level' });
      return;
    }

    // If a teacher is selected, validate:
    // 1. Teacher is qualified for this course
    // 2. Teacher is not already teaching at this same time slot in this batch
    if (formData.teacherId) {
      const selectedTeacher = teachers.find((t) => t.id === formData.teacherId);
      if (selectedTeacher) {
        // Check if teacher is qualified for this course
        if (!selectedTeacher.qualifiedCourses.includes(formData.courseId)) {
          setErrors({ form: 'Selected teacher is not qualified to teach this course' });
          return;
        }

        // Check if teacher is available at this time slot
        const conflictingClass = classes.find(
          (cls) =>
            cls.teacherId === formData.teacherId &&
            cls.programId === formData.programId &&
            cls.batch === parseInt(formData.batch) &&
            cls.slot === formData.slot &&
            (!initialData || cls.id !== initialData.id) // Exclude current class being edited
        );

        if (conflictingClass) {
          setErrors({
            form: 'Selected teacher is already assigned to another class at this time slot',
          });
          return;
        }
      }
    }

    onSubmit({
      name: generatedClassName,
      courseId: formData.courseId,
      programId: formData.programId,
      programLevel: formData.programLevel as ProgramLevel,
      batch: parseInt(formData.batch),
      slot: formData.slot,
      schedule: formData.slot,
      teacherId: formData.teacherId || undefined,
      students: initialData?.students || [],
      capacity: Math.floor(formData.capacity),
    });

    setFormData({
      courseId: '',
      programId: '',
      programLevel: '',
      batch: '1',
      slot: '',
      teacherId: '',
      capacity: 6,
    });
    setErrors({});
  };

  if (!coursesLoaded || !programsLoaded || !teachersLoaded) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>;
  }

  // Filter courses based on selected program level (if available)
  const filteredCourses = selectedCourse
    ? courses
    : courses.filter((c) => {
        // If a program level is selected, only show courses available for that level
        if (formData.programLevel) {
          return c.programLevels.includes(formData.programLevel as ProgramLevel);
        }
        return true;
      });

  const courseOptions = filteredCourses.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.programLevels.join(', ')})`,
  }));

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: `${p.name} - ${p.season} ${p.year}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {errors.form}
        </div>
      )}

      <Select
        label="Course"
        options={courseOptions}
        value={formData.courseId}
        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
        error={errors.courseId}
      />

      <Select
        label="Program"
        options={programOptions}
        value={formData.programId}
        onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
        error={errors.programId}
      />

      {selectedCourse && (
        <Select
          label="Program Level"
          options={selectedCourse.programLevels.map((level) => ({
            value: level,
            label: level,
          }))}
          value={formData.programLevel}
          onChange={(e) => setFormData({ ...formData, programLevel: e.target.value })}
          error={errors.programLevel}
        />
      )}

      {selectedProgram && batchOptions.length > 0 && (
        <Select
          label="Batch"
          options={batchOptions}
          value={formData.batch}
          onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
          error={errors.batch}
        />
      )}

      {selectedProgram && slotOptions.length > 0 && (
        <Select
          label="Time Slot"
          options={slotOptions}
          value={formData.slot}
          onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
          error={errors.slot}
        />
      )}

      {generatedClassName && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-700 font-semibold">Generated Class Name:</p>
          <p className="text-sm text-green-900 font-bold mt-1">{generatedClassName}</p>
        </div>
      )}

      {selectedCourse && (
        <Select
          label="Teacher (Optional)"
          options={[
            { value: '', label: 'Unassigned - Assign later' },
            ...teachers
              .filter((t) => t.status === 'Active' && t.qualifiedCourses.includes(formData.courseId))
              .map((t) => ({
                value: t.id,
                label: `${t.firstName} ${t.lastName}`,
              })),
          ]}
          value={formData.teacherId}
          onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
          error={errors.teacherId}
        />
      )}

      <Input
        label="Class Capacity"
        type="number"
        min="1"
        max="50"
        value={formData.capacity}
        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 6 })}
        error={errors.capacity}
      />

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p>💡 Class name is auto-generated from: Course + Season + Batch + Time Slot</p>
        <p className="mt-1">Set the maximum capacity (1-50). Default is 6 students per class</p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading || !generatedClassName}>
          {initialData ? 'Update Class' : 'Create Class'}
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
