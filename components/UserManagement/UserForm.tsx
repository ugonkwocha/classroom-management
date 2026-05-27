'use client';

import { useState } from 'react';
import { User, UserRole } from '@/types';
import { Button } from '@/components/ui';

interface UserFormProps {
  onSubmit: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }) => Promise<void>;
  onCancel: () => void;
  initialData?: User;
  allowedRoles?: UserRole[];
}

export function UserForm({ onSubmit, onCancel, initialData, allowedRoles }: UserFormProps) {
  const roles: UserRole[] = allowedRoles?.length ? allowedRoles : ['STAFF'];
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    password: '',
    role: (initialData?.role || roles[0]) as UserRole,
    isActive: initialData?.isActive ?? true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Email, first name, and last name are required');
      return;
    }

    // Password length validation
    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      const submitData = {
        ...formData,
        ...(formData.password ? { password: formData.password } : {}),
      };
      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-bold text-slate-700">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-bold text-slate-700">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>

      {!initialData && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-sm font-bold text-blue-950">Invite-based access</p>
          <p className="mt-1 text-sm text-blue-700">
            The user will receive an email invite and set their own password before they can sign in.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="role" className="mb-2 block text-sm font-bold text-slate-700">
          Role
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">
          {initialData
            ? 'Choose the user role for this account.'
            : roles.includes('ADMIN')
              ? 'Superadmins can invite admins or staff. Invited users set their own password.'
              : 'Admins can invite staff. Invited users set their own password.'}
        </p>
      </div>

      {initialData && (
      <div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-bold text-slate-700">Active</span>
        </label>
        <p className="mt-1.5 text-xs text-slate-500">Inactive users cannot log in</p>
      </div>
      )}

      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : initialData ? 'Update User' : 'Send Invite'}
        </Button>
      </div>
    </form>
  );
}
