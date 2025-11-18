'use client';

import { useState } from 'react';
import { Teacher, TeacherStatus } from '@/types';
import { Input, Select, Button } from '@/components/ui';
import { useCourses } from '@/lib/hooks';

interface TeacherFormProps {
  onSubmit: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: Teacher;
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ON_LEAVE', label: 'On Leave' },
];

export function TeacherForm({ onSubmit, onCancel, initialData, isLoading = false }: TeacherFormProps) {
  const { courses, isLoaded: coursesLoaded } = useCourses();

  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    bio: initialData?.bio || '',
    status: (initialData?.status || 'ACTIVE') as TeacherStatus,
    qualifiedCourses: initialData?.qualifiedCourses || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.qualifiedCourses.length === 0) newErrors.qualifiedCourses = 'At least one course qualification is required';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio || undefined,
      status: formData.status,
      qualifiedCourses: formData.qualifiedCourses,
    });

    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      bio: '',
      status: 'ACTIVE',
      qualifiedCourses: [],
    });
    setErrors({});
  };

  const toggleCourse = (courseId: string) => {
    setFormData({
      ...formData,
      qualifiedCourses: formData.qualifiedCourses.includes(courseId)
        ? formData.qualifiedCourses.filter((id) => id !== courseId)
        : [...formData.qualifiedCourses, courseId],
    });
  };

  if (!coursesLoaded) {
    return <div className="text-center py-4 text-gray-500">Loading courses...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name"
          type="text"
          placeholder="John"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          error={errors.firstName}
        />
        <Input
          label="Last Name"
          type="text"
          placeholder="Doe"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          error={errors.lastName}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="john.doe@example.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
      />

      <Input
        label="Phone Number"
        type="tel"
        placeholder="+1 (555) 000-0000"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        error={errors.phone}
      />

      <Input
        label="Bio (Optional)"
        type="text"
        placeholder="Brief bio or qualifications"
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
      />

      <Select
        label="Status"
        options={statusOptions}
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value as TeacherStatus })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Qualified Courses
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">No courses available</p>
          ) : (
            courses.map((course) => (
              <label key={course.id} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.qualifiedCourses.includes(course.id)}
                  onChange={() => toggleCourse(course.id)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">{course.name}</p>
                  <p className="text-xs text-gray-600">{course.description}</p>
                </div>
              </label>
            ))
          )}
        </div>
        {errors.qualifiedCourses && (
          <p className="mt-2 text-sm text-red-500">{errors.qualifiedCourses}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {initialData ? 'Update Teacher' : 'Create Teacher'}
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
