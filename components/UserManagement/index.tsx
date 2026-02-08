'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { Card, Modal } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { UserForm } from './UserForm';
import { UserList } from './UserList';

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
      <div className="text-center py-12">
        <p className="text-red-600 text-lg">You do not have permission to manage users.</p>
        <p className="text-gray-500 text-sm mt-2">Only superadmins can manage users.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-#db3236 mb-4"></div>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-#db3236"
        />
        <button
          onClick={() => {
            setEditingUser(undefined);
            setIsFormModalOpen(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-[#db3236] to-[#c12b30] text-white font-semibold rounded-lg hover:from-[#c12b30] hover:to-[#b8261f]"
        >
          + Add User
        </button>
      </div>

      <Card>
        <UserList
          users={filteredUsers}
          onEdit={(user) => {
            setEditingUser(user);
            setIsFormModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </Card>

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
