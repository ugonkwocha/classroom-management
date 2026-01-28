'use client';

import { User } from '@/types';
import { Badge, Button } from '@/components/ui';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export function UserList({ users, onEdit, onDelete }: UserListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No users found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div>
            <h3 className="font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <div className="flex gap-2 mt-2 text-sm text-gray-600">
              <span>{user.email}</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant={user.role === 'SUPERADMIN' ? 'danger' : user.role === 'ADMIN' ? 'warning' : 'primary'}>
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
              </Badge>
              <Badge variant={user.isActive ? 'success' : 'danger'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(user.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
