'use client';

import { useState } from 'react';
import { Student } from '@/types';
import { Input, Select, Button } from '@/components/ui';
import { calculateAge, getProgramLevel } from '@/lib/utils';

interface StudentFormProps {
  onSubmit: (student: Omit<Student, 'id'>) => void;
  initialData?: Student;
  isLoading?: boolean;
}

export function StudentForm({ onSubmit, initialData, isLoading = false }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    contactInfo: initialData?.contactInfo || '',
    isReturning: initialData?.isReturning || false,
    hasSiblings: initialData?.hasSiblings || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.contactInfo.trim()) newErrors.contactInfo = 'Contact info is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const age = calculateAge(formData.dateOfBirth);
      const programLevel = getProgramLevel(age);

      onSubmit({
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        contactInfo: formData.contactInfo,
        programLevel,
        priority: 0,
        isReturning: formData.isReturning,
        hasSiblings: formData.hasSiblings,
      });

      setFormData({
        name: '',
        dateOfBirth: '',
        contactInfo: '',
        isReturning: false,
        hasSiblings: false,
      });
      setErrors({});
    } catch (error) {
      setErrors({ dateOfBirth: 'Student age must be between 6 and 16' });
    }
  };

  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const programLevel = age ? (() => { try { return getProgramLevel(age); } catch { return null; } })() : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Student Name"
        type="text"
        placeholder="Enter student name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Input
        label="Date of Birth"
        type="date"
        value={formData.dateOfBirth}
        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
        error={errors.dateOfBirth}
      />

      {age !== null && (
        <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
          <p>Age: {age} years</p>
          {programLevel && <p>Program: {programLevel}</p>}
        </div>
      )}

      <Input
        label="Contact Information"
        type="email"
        placeholder="Email or phone number"
        value={formData.contactInfo}
        onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
        error={errors.contactInfo}
      />

      <div className="space-y-2">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.isReturning}
            onChange={(e) => setFormData({ ...formData, isReturning: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded"
          />
          <span className="text-sm text-gray-700">Returning student</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.hasSiblings}
            onChange={(e) => setFormData({ ...formData, hasSiblings: e.target.checked })}
            className="w-4 h-4 text-purple-600 rounded"
          />
          <span className="text-sm text-gray-700">Has siblings in academy</span>
        </label>
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
        {initialData ? 'Update Student' : 'Add Student'}
      </Button>
    </form>
  );
}
