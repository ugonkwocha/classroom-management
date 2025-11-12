'use client';

import { useState } from 'react';
import { useClasses, useStudents } from '@/lib/hooks';
import { Class } from '@/types';
import { Card, Modal } from '@/components/ui';
import { ClassForm } from './ClassForm';
import { ClassCard } from './ClassCard';

export function ClassManagement() {
  const { classes, isLoaded, addClass, updateClass, deleteClass } = useClasses();
  const { students } = useStudents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | undefined>();
  const [filter, setFilter] = useState<string>('');

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(filter.toLowerCase()) ||
      cls.programLevel.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = (classData: Omit<Class, 'id' | 'createdAt'>) => {
    if (editingClass) {
      updateClass(editingClass.id, classData);
      setEditingClass(undefined);
    } else {
      addClass(classData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (classData: Class) => {
    setEditingClass(classData);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      deleteClass(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClass(undefined);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search classes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800"
        >
          + Create Class
        </button>
      </div>

      {filteredClasses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No classes yet. Create one to get started!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((classData) => {
            const studentCount = students.filter((s) => s.classId === classData.id).length;
            return (
              <ClassCard
                key={classData.id}
                classData={classData}
                onEdit={handleEdit}
                onDelete={handleDelete}
                studentCount={studentCount}
              />
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClass ? 'Edit Class' : 'Create New Class'}>
        <ClassForm onSubmit={handleSubmit} initialData={editingClass} />
      </Modal>
    </div>
  );
}
