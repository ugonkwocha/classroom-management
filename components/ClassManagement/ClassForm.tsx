'use client';

import { useState } from 'react';
import { Class, ProgramLevel } from '@/types';
import { Input, Select, Button } from '@/components/ui';

interface ClassFormProps {
  onSubmit: (classData: Omit<Class, 'id' | 'createdAt'>) => void;
  initialData?: Class;
  isLoading?: boolean;
}

const programOptions = [
  { value: 'AI Explorers', label: 'AI Explorers (Ages 6-8)' },
  { value: 'AI Creators', label: 'AI Creators (Ages 9-12)' },
  { value: 'AI Innovators', label: 'AI Innovators (Ages 13-16)' },
];

export function ClassForm({ onSubmit, initialData, isLoading = false }: ClassFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    programLevel: (initialData?.programLevel || '') as ProgramLevel,
    schedule: initialData?.schedule || '',
    teacher: initialData?.teacher || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Class name is required';
    if (!formData.programLevel) newErrors.programLevel = 'Program level is required';
    if (!formData.schedule.trim()) newErrors.schedule = 'Schedule is required';
    if (!formData.teacher.trim()) newErrors.teacher = 'Teacher name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: formData.name,
      programLevel: formData.programLevel,
      schedule: formData.schedule,
      teacher: formData.teacher,
      students: initialData?.students || [],
      capacity: 6,
    });

    setFormData({
      name: '',
      programLevel: '' as ProgramLevel,
      schedule: '',
      teacher: '',
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Class Name"
        type="text"
        placeholder="e.g., Group A, Morning Class"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Select
        label="Program Level"
        options={programOptions}
        value={formData.programLevel}
        onChange={(e) => setFormData({ ...formData, programLevel: e.target.value as ProgramLevel })}
        error={errors.programLevel}
      />

      <Input
        label="Schedule"
        type="text"
        placeholder="e.g., Monday & Wednesday 3PM"
        value={formData.schedule}
        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
        error={errors.schedule}
      />

      <Input
        label="Teacher Name"
        type="text"
        placeholder="Instructor name"
        value={formData.teacher}
        onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
        error={errors.teacher}
      />

      <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
        {initialData ? 'Update Class' : 'Create Class'}
      </Button>
    </form>
  );
}
