'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Family } from '@/types';
import { useFamilies } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { formatGuardianName } from '@/lib/family-utils';
import { Button, Input, Modal, PhoneInput, Select } from '@/components/ui';
import {
  FiAlertCircle,
  FiGitMerge,
  FiHome,
  FiMail,
  FiMove,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';

const relationshipOptions = [
  { value: 'PARENT', label: 'Parent' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
];

function getPrimaryGuardian(family: Family) {
  return family.guardians.find((guardian) => guardian.isPrimary && guardian.isActive)
    || family.guardians.find((guardian) => guardian.isActive)
    || family.guardians[0];
}

export function FamiliesManagement() {
  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [moveSelections, setMoveSelections] = useState<Record<string, string>>({});
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: 'NG',
    relationship: 'PARENT',
  });

  const { families, isLoaded, createFamily, deleteFamily, deleteEmptyFamilies, mergeFamily, moveStudentToFamily, mutate } = useFamilies(search);
  const { hasPermission } = useAuth();

  const canCreate = hasPermission(PERMISSIONS.CREATE_FAMILY);
  const canEdit = hasPermission(PERMISSIONS.UPDATE_FAMILY);
  const canDelete = hasPermission(PERMISSIONS.DELETE_FAMILY);
  const canMerge = hasPermission(PERMISSIONS.MERGE_FAMILY);

  const activeGuardians = families.reduce(
    (total, family) => total + family.guardians.filter((guardian) => guardian.isActive).length,
    0
  );
  const linkedStudents = families.reduce((total, family) => total + (family.students?.length || 0), 0);
  const emptyFamilies = families.filter((family) => (family.students?.length || 0) === 0).length;
  const needsReview = families.filter((family) =>
    family.guardians.some((guardian) => guardian.needsReview)
  ).length;

  const familyOptions = useMemo(
    () =>
      families
        .filter((family) => family.id !== selectedFamily?.id)
        .map((family) => ({ value: family.id, label: family.displayName })),
    [families, selectedFamily?.id]
  );

  const handleCreateFamily = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createFamily({
        displayName: formData.displayName || `${formData.lastName} Family`,
        guardians: [
          {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email || null,
            phone: formData.phone || null,
            phoneCountryCode: formData.phoneCountryCode,
            relationship: formData.relationship,
            isPrimary: true,
            isActive: true,
            needsReview: false,
          },
        ],
      });
      setFormData({
        displayName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        phoneCountryCode: 'NG',
        relationship: 'PARENT',
      });
      setIsCreateOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create family');
    }
  };

  const handleDelete = async (family: Family) => {
    if (!window.confirm(`Delete ${family.displayName}? This will also remove its guardian records.`)) return;
    try {
      await deleteFamily(family.id);
      if (selectedFamily?.id === family.id) setSelectedFamily(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete family');
    }
  };

  const handleDeleteEmptyFamilies = async () => {
    if (!window.confirm(`Delete ${emptyFamilies} empty famil${emptyFamilies === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return;

    try {
      await deleteEmptyFamilies();
      setSelectedFamily(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete empty families');
    }
  };

  const handleMoveStudent = async (studentId: string) => {
    const destinationFamilyId = moveSelections[studentId];
    if (!destinationFamilyId) return;

    try {
      await moveStudentToFamily(studentId, destinationFamilyId);
      await mutate();
      setSelectedFamily((family) =>
        family
          ? {
              ...family,
              students: family.students?.filter((student) => student.id !== studentId),
            }
          : family
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to move student');
    }
  };

  const handleMerge = async () => {
    if (!selectedFamily || !mergeSourceId) return;

    try {
      const merged = await mergeFamily(selectedFamily.id, mergeSourceId);
      setSelectedFamily(merged);
      setMergeSourceId('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to merge families');
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard icon={<FiHome />} label="Total Families" value={families.length} tone="blue" />
        <MetricCard icon={<FiUsers />} label="Active Guardians" value={activeGuardians} tone="emerald" />
        <MetricCard icon={<FiUsers />} label="Linked Students" value={linkedStudents} tone="amber" />
        <MetricCard icon={<FiAlertCircle />} label="Needs Review" value={needsReview} tone="rose" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Family Directory</h2>
            <p className="mt-1 text-sm text-slate-500">Manage households, guardians, sibling groups, and contact routing.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm sm:w-80">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search families, guardians, students..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Add Family
              </button>
            )}
            {canDelete && emptyFamilies > 0 && (
              <button
                type="button"
                onClick={handleDeleteEmptyFamilies}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete empty families
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Family</th>
                <th className="px-5 py-4">Primary Guardian</th>
                <th className="px-5 py-4">Contact</th>
                <th className="px-5 py-4">Children</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {families.map((family) => {
                const primary = getPrimaryGuardian(family);
                return (
                  <tr key={family.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => setSelectedFamily(family)} className="flex items-center gap-3 text-left">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <FiHome className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block font-bold text-slate-950">{family.displayName}</span>
                          <span className="text-xs text-slate-500">{family.guardians.length} guardian{family.guardians.length === 1 ? '' : 's'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {primary ? formatGuardianName(primary.firstName, primary.lastName) : 'No guardian'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{primary?.email || 'No email'}</p>
                      <p className="mt-1 text-xs text-slate-500">{primary?.phone || 'No phone'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {family.students?.length || 0} linked
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        family.guardians.some((guardian) => guardian.needsReview)
                          ? 'border-amber-100 bg-amber-50 text-amber-700'
                          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      }`}>
                        {family.guardians.some((guardian) => guardian.needsReview) ? 'Needs review' : 'Ready'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFamily(family)}>
                          View
                        </Button>
                        {canDelete && (
                          <Button type="button" variant="danger" size="sm" onClick={() => handleDelete(family)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Family" size="lg">
        <form onSubmit={handleCreateFamily} className="space-y-4">
          <Input
            label="Family Display Name"
            value={formData.displayName}
            onChange={(event) => setFormData({ ...formData, displayName: event.target.value })}
            placeholder="e.g., Nwkocha Family"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Guardian First Name"
              required
              value={formData.firstName}
              onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
            />
            <Input
              label="Guardian Last Name"
              required
              value={formData.lastName}
              onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
            />
          </div>
          <Input
            label="Guardian Email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          />
          <PhoneInput
            label="Guardian Phone"
            value={formData.phone}
            countryCode={formData.phoneCountryCode}
            onCountryCodeChange={(phoneCountryCode) => setFormData({ ...formData, phoneCountryCode })}
            onChange={(phone) => setFormData({ ...formData, phone })}
          />
          <Select
            label="Relationship"
            value={formData.relationship}
            onChange={(event) => setFormData({ ...formData, relationship: event.target.value })}
            options={relationshipOptions}
          />
          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <Button type="submit" className="flex-1">Create Family</Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedFamily} onClose={() => setSelectedFamily(null)} title={selectedFamily?.displayName || 'Family'} size="xl">
        {selectedFamily && (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Guardians</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedFamily.guardians.map((guardian) => (
                  <div key={guardian.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-950">{formatGuardianName(guardian.firstName, guardian.lastName)}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{guardian.relationship}</p>
                      </div>
                      {guardian.isPrimary && (
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">Primary</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2"><FiMail className="h-4 w-4" /> {guardian.email || 'No email'}</p>
                      <p className="flex items-center gap-2"><FiPhone className="h-4 w-4" /> {guardian.phone || 'No phone'}</p>
                    </div>
                    {guardian.needsReview && (
                      <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                        Needs name/contact review from migrated data
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Linked Students</h3>
              <div className="space-y-2">
                {(selectedFamily.students || []).map((student) => (
                  <div key={student.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-950">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-slate-500">{student.email || 'No student email'}</p>
                    </div>
                    {canEdit && (
                      <div className="flex min-w-0 gap-2 sm:w-80">
                        <select
                          value={moveSelections[student.id] || ''}
                          onChange={(event) => setMoveSelections({ ...moveSelections, [student.id]: event.target.value })}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                        >
                          <option value="">Move to...</option>
                          {familyOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleMoveStudent(student.id)}>
                          <FiMove className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(selectedFamily.students || []).length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No students linked to this family yet.
                  </p>
                )}
              </div>
            </section>

            {canMerge && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-blue-950">Merge another family into this one</label>
                    <select
                      value={mergeSourceId}
                      onChange={(event) => setMergeSourceId(event.target.value)}
                      className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Choose duplicate family...</option>
                      {familyOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" onClick={handleMerge} disabled={!mergeSourceId}>
                    <FiGitMerge className="h-4 w-4" />
                    Merge
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
