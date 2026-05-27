'use client';

import { useState, useMemo } from 'react';
import { Class, ProgramLevel } from '@/types';
import { Input, Select, Button } from '@/components/ui';
import { useCourses, usePrograms, useClasses, useTeachers } from '@/lib/hooks';
import { generateClassNameWithNextSuffix } from '@/lib/utils';

interface ClassFormProps {
  onSubmit: (classData: Omit<Class, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: Class;
  isLoading?: boolean;
  isDuplicate?: boolean;
}

export function ClassForm({ onSubmit, onCancel, initialData, isLoading = false, isDuplicate = false }: ClassFormProps) {
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
    meetLink: initialData?.meetLink || '',
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
      return generateClassNameWithNextSuffix({
        courseName: selectedCourse.name,
        season: selectedProgram.season,
        year: selectedProgram.year,
        batch: formData.batch,
        slot: formData.slot,
        classes,
        excludeClassId: initialData && !isDuplicate ? initialData.id : undefined,
      });
    }
    return '';
  }, [selectedCourse, selectedProgram, formData.batch, formData.slot, classes, initialData, isDuplicate]);

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
    if (formData.meetLink.trim()) {
      try {
        const url = new URL(formData.meetLink.trim());
        if (url.protocol !== 'https:' || url.hostname !== 'meet.google.com') {
          newErrors.meetLink = 'Enter a valid Google Meet link';
        }
      } catch {
        newErrors.meetLink = 'Enter a valid Google Meet link';
      }
    }

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
      meetLink: formData.meetLink.trim() || undefined,
      students: isDuplicate ? [] : initialData?.students || [],
      capacity: Math.floor(formData.capacity),
      isArchived: isDuplicate ? false : initialData?.isArchived ?? false,
    });

    setFormData({
      courseId: '',
      programId: '',
      programLevel: '',
      batch: '1',
      slot: '',
      teacherId: '',
      meetLink: '',
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
              .filter((t) => t.status === 'ACTIVE' && t.qualifiedCourses.includes(formData.courseId))
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

      <Input
        label="Google Meet Link (Optional)"
        type="url"
        placeholder="https://meet.google.com/abc-defg-hij"
        value={formData.meetLink}
        onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
        error={errors.meetLink}
      />

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p>💡 Class name is auto-generated from: Course + Month Year + Batch + Time Slot</p>
        <p className="mt-1">Example: &quot;Scratch 101 - Jan 2026 - Batch 1 - Sat 10am-12pm-A&quot;</p>
        <p className="mt-1">Set the maximum capacity (1-50). Default is 6 students per class</p>
        <p className="mt-1">Paste the Google Meet link here after creating it from the academy Gmail account.</p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading || !generatedClassName}>
          {isDuplicate ? 'Create Duplicate' : initialData ? 'Update Class' : 'Create Class'}
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
