'use client';

import { useState, useEffect } from 'react';
import { User, UserInvitation, UserRole } from '@/types';
import { Modal } from '@/components/ui';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { UserForm } from './UserForm';
import { UserList } from './UserList';
import { FiMail, FiPlus, FiSearch, FiShield, FiSlash, FiTrash2, FiUserCheck, FiUsers, FiUserX } from 'react-icons/fi';

function getInvitableRoles(role?: UserRole): UserRole[] {
  if (role === 'SUPERADMIN') return ['ADMIN', 'STAFF'];
  if (role === 'ADMIN') return ['STAFF'];
  return [];
}

export function UserManagement() {
  const { hasPermission, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  // Check if user has permission to manage users
  const canManageUsers = hasPermission(PERMISSIONS.CREATE_USER);
  const canReadUsers = hasPermission(PERMISSIONS.READ_USERS);
  const canEditUsers = hasPermission(PERMISSIONS.UPDATE_USER);
  const canDeleteUsers = hasPermission(PERMISSIONS.DELETE_USER);
  const allowedInviteRoles = getInvitableRoles(user?.role);

  useEffect(() => {
    if (!canReadUsers) {
      return;
    }
    fetchAccessData();
  }, [canReadUsers]);

  const fetchAccessData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const [usersResponse, invitationsResponse] = await Promise.all([
        fetch('/api/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('/api/users/invitations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      if (!invitationsResponse.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const usersData = await usersResponse.json();
      const invitationsData = await invitationsResponse.json();
      setUsers(usersData);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }) => {
    try {
      setError('');
      setNotice('');
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
        const response = await fetch('/api/users/invitations', {
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
        setInvitations([created.invitation, ...invitations]);
        setNotice(
          created.emailDelivery?.success
            ? `Invitation sent to ${created.invitation.email}.`
            : `Invitation created, but the email could not be sent: ${created.emailDelivery?.error || 'unknown email error'}`
        );
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

  const handleRevokeInvitation = async (invitation: UserInvitation) => {
    if (!window.confirm(`Revoke the invitation for ${invitation.email}? The invite link will stop working.`)) {
      return;
    }

    try {
      setError('');
      setNotice('');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/invitations/${invitation.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      setInvitations(invitations.filter((item) => item.id !== invitation.id));
      setNotice(`Invitation revoked for ${invitation.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleDeleteInvitation = async (invitation: UserInvitation) => {
    if (!window.confirm(`Delete the invitation record for ${invitation.email}? This cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setNotice('');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/users/invitations/${invitation.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete invitation');
      }

      setInvitations(invitations.filter((item) => item.id !== invitation.id));
      setNotice(`Invitation deleted for ${invitation.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invitation');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
      user.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (!canReadUsers || !canManageUsers || allowedInviteRoles.length === 0) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-14 text-center">
        <p className="text-base font-bold text-rose-700">You do not have permission to invite users.</p>
        <p className="mt-2 text-sm text-rose-600">Superadmins can invite admins and staff. Admins can invite staff.</p>
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
  const pendingInvites = invitations.filter((invitation) => invitation.status === 'PENDING').length;

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
          <p className="text-sm font-medium text-slate-500">Pending Invites</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{pendingInvites}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">{notice}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">User Access</h2>
            <p className="mt-1 text-sm text-slate-500">Invite team members and manage login access.</p>
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
              Invite User
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
            canEdit={canEditUsers}
            canDelete={canDeleteUsers}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Pending Invitations</h2>
            <p className="mt-1 text-sm text-slate-500">People who have been invited but have not created their account yet.</p>
          </div>
        </div>
        <div className="p-5">
          {invitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <FiMail className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-slate-950">No pending invitations</p>
              <p className="mt-1 text-sm text-slate-500">New invitations will appear here until they are accepted.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-4">Invitee</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Invited By</th>
                    <th className="px-5 py-4">Expires</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-950">
                        {invitation.firstName} {invitation.lastName}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">{invitation.email}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {invitation.invitedBy
                          ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                          : 'Unknown'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRevokeInvitation(invitation)}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                            aria-label={`Revoke invitation for ${invitation.email}`}
                          >
                            <FiSlash className="h-4 w-4" />
                            Revoke
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvitation(invitation)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                            aria-label={`Delete invitation for ${invitation.email}`}
                          >
                            <FiTrash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(undefined);
        }}
        title={editingUser ? 'Edit User' : 'Invite User'}
      >
        <UserForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormModalOpen(false);
            setEditingUser(undefined);
          }}
          initialData={editingUser}
          allowedRoles={editingUser ? ['SUPERADMIN', 'ADMIN', 'STAFF'] : allowedInviteRoles}
        />
      </Modal>
    </div>
  );
}
