'use client';

import { useState } from 'react';
import { usePrograms } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { Program } from '@/types';
import { Modal } from '@/components/ui';
import { PERMISSIONS } from '@/lib/permissions';
import { ProgramForm } from './ProgramForm';
import { ProgramList } from './ProgramList';
import { ProgramDetailsView } from './ProgramDetailsView';
import { FiCalendar, FiClock, FiLayers, FiPlus, FiSearch, FiSun } from 'react-icons/fi';

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading programs...</p>
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const holidayPrograms = programs.filter((program) => program.type === 'HOLIDAY_CAMP').length;
  const totalBatches = programs.reduce((sum, program) => sum + program.batches, 0);
  const totalSlots = programs.reduce((sum, program) => sum + program.slots.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiCalendar className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Total Programs</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{programs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiSun className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Holiday Camps</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{holidayPrograms}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <FiLayers className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Batches</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{totalBatches}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <FiClock className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Time Slots</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{totalSlots}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Program Calendar</h2>
            <p className="mt-1 text-sm text-slate-500">Season, batch, and slot structure for {currentYear} and beyond.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Program
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <ProgramList
            programs={filteredPrograms}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm font-medium leading-6 text-blue-800">
        Programs define the academy structure for courses, batches, and time slots. Default 9jacodekids Academy programs are pre-loaded and can be adjusted as operations evolve.
      </section>

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
