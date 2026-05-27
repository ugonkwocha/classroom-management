'use client';

import { User } from '@/types';
import { Badge } from '@/components/ui';
import { FiEdit3, FiTrash2, FiUser } from 'react-icons/fi';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export function UserList({ users, onEdit, onDelete }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiUser className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-slate-950">No users found</p>
        <p className="mt-1 text-sm text-slate-500">Create an admin or staff account to manage access.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
            <th className="px-5 py-4">User</th>
            <th className="px-5 py-4">Email</th>
            <th className="px-5 py-4">Role</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FiUser className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-slate-950">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 font-medium text-slate-700">{user.email}</td>
              <td className="px-5 py-4">
                <Badge variant={user.role === 'SUPERADMIN' ? 'danger' : user.role === 'ADMIN' ? 'warning' : 'primary'}>
                  {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(user)}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:text-blue-600"
                    aria-label={`Edit ${user.firstName} ${user.lastName}`}
                  >
                    <FiEdit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(user.id)}
                    className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                    aria-label={`Delete ${user.firstName} ${user.lastName}`}
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
