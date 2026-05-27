'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { Modal } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { UserForm } from './UserForm';
import { UserList } from './UserList';
import { FiPlus, FiSearch, FiShield, FiUserCheck, FiUsers, FiUserX } from 'react-icons/fi';

export function UserManagement() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Check if user has permission to manage users
  const canManageUsers = hasPermission(PERMISSIONS.CREATE_USER);

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }
    fetchUsers();
  }, [canManageUsers]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }) => {
    try {
      setError('');
      const token = localStorage.getItem('authToken');

      if (editingUser) {
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          throw new Error('Failed to update user');
        }

        const updated = await response.json();
        setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create user');
        }

        const created = await response.json();
        setUsers([...users, created]);
      }

      setIsFormModalOpen(false);
      setEditingUser(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError('');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      user.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-14 text-center">
        <p className="text-base font-bold text-rose-700">You do not have permission to manage users.</p>
        <p className="mt-2 text-sm text-rose-600">Only superadmins can manage users.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const superadmins = users.filter((user) => user.role === 'SUPERADMIN').length;
  const admins = users.filter((user) => user.role === 'ADMIN').length;
  const activeUsers = users.filter((user) => user.isActive).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiUsers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Users</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiShield className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Superadmins</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{superadmins}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <FiUserCheck className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Admins</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{admins}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiUserX className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Active Users</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{activeUsers}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">User Access</h2>
            <p className="mt-1 text-sm text-slate-500">Manage staff permissions and login access.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingUser(undefined);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        <div className="p-5">
          <UserList
            users={filteredUsers}
            onEdit={(user) => {
              setEditingUser(user);
              setIsFormModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      </section>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(undefined);
        }}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <UserForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingUser(undefined);
          }}
          initialData={editingUser}
        />
      </Modal>
    </div>
  );
}
