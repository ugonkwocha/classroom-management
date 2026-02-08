'use client';

import { useState } from 'react';
import { usePrograms } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Program } from '@/types';
import { Card, Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { ProgramForm } from './ProgramForm';
import { ProgramList } from './ProgramList';
import { ProgramDetailsView } from './ProgramDetailsView';

export function ProgramsManagement() {
  const { programs, isLoaded, addProgram, updateProgram, deleteProgram } = usePrograms();
  const { hasPermission } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>();
  const [viewingProgram, setViewingProgram] = useState<Program | undefined>();
  const [filter, setFilter] = useState<string>('');

  const canCreate = hasPermission(PERMISSIONS.CREATE_PROGRAM);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_PROGRAM);
  const canDelete = hasPermission(PERMISSIONS.DELETE_PROGRAM);

  const filteredPrograms = programs.filter((program) =>
    program.name.toLowerCase().includes(filter.toLowerCase()) ||
    program.season.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = (programData: Omit<Program, 'id' | 'createdAt'>) => {
    if (editingProgram) {
      updateProgram(editingProgram.id, programData);
      setEditingProgram(undefined);
    } else {
      addProgram(programData);
    }
    setIsModalOpen(false);
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this program? Classes associated with it will not be deleted.')) {
      try {
        await deleteProgram(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete program';
        console.error('Error deleting program:', error);
        alert(`Error deleting program: ${errorMessage}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProgram(undefined);
  };

  const handleView = (program: Program) => {
    setViewingProgram(program);
  };

  const handleCloseDetailsView = () => {
    setViewingProgram(undefined);
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search programs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-#db3236"
        />
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#db3236] to-[#c12b30] text-white font-semibold rounded-lg hover:from-[#c12b30] hover:to-[#b8261f]"
          >
            + Add Program
          </button>
        )}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          ℹ️ Programs define the structure of your courses (batches and time slots). Default programs for 9jacodekids Academy are pre-loaded.
        </p>
      </Card>

      <Card>
        <ProgramList
          programs={filteredPrograms}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProgram ? 'Edit Program' : 'Add New Program'}>
        <ProgramForm onSubmit={handleSubmit} onCancel={handleCloseModal} initialData={editingProgram} />
      </Modal>

      <Modal isOpen={!!viewingProgram} onClose={handleCloseDetailsView} title="" size="lg">
        {viewingProgram && (
          <ProgramDetailsView program={viewingProgram} onClose={handleCloseDetailsView} />
        )}
      </Modal>
    </div>
  );
}
