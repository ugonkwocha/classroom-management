'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiCreditCard,
  FiDatabase,
  FiLink,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUpload,
  FiUsers,
} from 'react-icons/fi';
import { useCourses, useFamilies, usePrograms } from '@/lib/hooks';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import type {
  ConfirmedRegistrationImport,
  Family,
  FluentFormMapping,
  PriceType,
  Program,
} from '@/types';

type WorkspaceTab = 'import' | 'existing-family' | 'mappings' | 'history';

type ExternalRegistration = {
  sourceFormId: string;
  sourceSubmissionId: string;
  submittedAt?: string | null;
  parentFirstName: string;
  parentLastName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentPhoneCountryCode?: string | null;
  expectedAmount?: number | null;
  children: Array<{
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    phoneCountryCode?: string | null;
    dateOfBirth?: string | null;
    courseId?: string | null;
    courseName?: string | null;
    batchNumber?: number | null;
    sourceOptionText?: string | null;
    priceType?: PriceType | string | null;
    priceAmount?: number | null;
  }>;
  matchingFamilies?: Family[];
  rawPayload?: unknown;
};

const priceTypes: PriceType[] = ['FULL_PRICE', 'SIBLING_DISCOUNT', 'EARLY_BIRD'];

function formatCurrency(amount?: number | null) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusClass(status?: string) {
  if (status === 'SYNCED' || status === 'PROCESSED') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === 'FAILED') return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-amber-100 bg-amber-50 text-amber-700';
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">{children}</section>;
}

function optionStringsFromValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\s*\|\s*|\s*;\s*/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getSelectedFormOptions(registration: ExternalRegistration | null) {
  if (!registration) return [];
  const rawPayload = registration.rawPayload as any;
  const selectedSlots = [
    ...optionStringsFromValue(rawPayload?.selectedSlots),
    ...optionStringsFromValue(rawPayload?.selectedSlot),
    ...optionStringsFromValue(rawPayload?.selectedOptions),
    ...optionStringsFromValue(rawPayload?.fluentFormPayload?.multi_select),
  ];

  const childOptions = registration.children
    .map((child) => child.sourceOptionText)
    .filter((value): value is string => Boolean(value?.trim()));

  return Array.from(new Set([...selectedSlots, ...childOptions]));
}

function getMappedSelectedOptions(registration: ExternalRegistration | null, mapping: FluentFormMapping | null) {
  const selectedOptions = getSelectedFormOptions(registration);
  const activeMappings = mapping?.optionMappings?.filter((option) => option.isActive) || [];

  return selectedOptions.map((optionText) => ({
    optionText,
    mapping: activeMappings.find((option) => option.sourceOptionText === optionText) || null,
  }));
}

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

async function uploadProof(file: File | null, payload: Record<string, string>) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(payload).forEach(([key, value]) => {
    if (value) formData.append(key, value);
  });

  const response = await fetchWithAuth('/api/payment-proofs', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Payment proof upload failed');
  }

  return response.json();
}

export function ConfirmedRegistrationsManagement() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('import');
  const [mappings, setMappings] = useState<FluentFormMapping[]>([]);
  const [imports, setImports] = useState<ConfirmedRegistrationImport[]>([]);
  const [searchResults, setSearchResults] = useState<ExternalRegistration[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<ExternalRegistration | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [search, setSearch] = useState({ email: '', phone: '', submissionId: '', formId: '' });
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [importForm, setImportForm] = useState({
    priceType: 'FULL_PRICE' as PriceType,
    confirmedAmount: 0,
    paymentProofNote: '',
  });
  const { programs } = usePrograms();
  const { courses } = useCourses();
  const { families, mutate: mutateFamilies } = useFamilies();

  const [mappingForm, setMappingForm] = useState({
    id: '',
    formId: '',
    formName: '',
    programId: '',
    leadTag: '',
    paidTag: '',
    removeLeadTagOnPaid: false,
    isActive: true,
    optionMappings: [{ sourceOptionText: '', batchNumber: 1, isActive: true }],
  });

  const [existingFamilyForm, setExistingFamilyForm] = useState({
    familyId: '',
    existingStudentId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    programId: '',
    batchNumber: 1,
    priceType: 'FULL_PRICE' as PriceType,
    confirmedAmount: 0,
    paidTag: '',
    paymentProofNote: '',
  });

  const selectedFamily = useMemo(
    () => families.find((family) => family.id === existingFamilyForm.familyId),
    [existingFamilyForm.familyId, families]
  );

  const loadMappings = useCallback(async () => {
    const response = await fetchWithAuth('/api/fluent-form-mappings');
    if (response.ok) setMappings(await response.json());
  }, []);

  const loadImports = useCallback(async () => {
    const response = await fetchWithAuth('/api/confirmed-registrations');
    if (response.ok) setImports(await response.json());
  }, []);

  useEffect(() => {
    loadMappings();
    loadImports();
  }, [loadImports, loadMappings]);

  const matchingMapping = selectedRegistration
    ? mappings.find((mapping) => mapping.formId === selectedRegistration.sourceFormId && mapping.isActive)
    : null;
  const mappedSelectedOptions = getMappedSelectedOptions(selectedRegistration, matchingMapping || null);
  const hasUnmappedSelectedOptions = mappedSelectedOptions.some((item) => !item.mapping);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setSelectedRegistration(null);
    try {
      const params = new URLSearchParams();
      Object.entries(search).forEach(([key, value]) => {
        if (value.trim()) params.set(key, value.trim());
      });
      const response = await fetchWithAuth(`/api/confirmed-registrations/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data.results || []);
      if ((data.results || []).length === 0) {
        setMessage({ type: 'error', text: 'No matching WordPress registration found.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Search failed' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleImport = async () => {
    if (!selectedRegistration) return;
    setIsBusy(true);
    setMessage(null);
    try {
      if (!matchingMapping) {
        throw new Error(`No active form mapping exists for form ${selectedRegistration.sourceFormId}.`);
      }

      if (mappedSelectedOptions.length === 0) {
        throw new Error('No selected date/batch option was found in this WordPress registration.');
      }

      const unmappedOption = mappedSelectedOptions.find((item) => !item.mapping);
      if (unmappedOption) {
        throw new Error(`The selected form option "${unmappedOption.optionText}" is not mapped to a CMS batch yet.`);
      }

      const confirmedAmount = Number(importForm.confirmedAmount || 0);
      if (confirmedAmount <= 0) {
        throw new Error('Confirmed amount must be greater than zero.');
      }

      const mappedOptions = mappedSelectedOptions.flatMap((item) => (item.mapping ? [item.mapping] : []));
      const enrollmentItemsCount = Math.max(selectedRegistration.children.length * mappedOptions.length, 1);
      const splitAmount = Math.round(confirmedAmount / enrollmentItemsCount);

      const response = await fetchWithAuth('/api/confirmed-registrations/import', {
        method: 'POST',
        body: JSON.stringify({
          ...selectedRegistration,
          familyId: selectedFamilyId || undefined,
          confirmedAmount,
          paymentProofNote: importForm.paymentProofNote,
          rawPayload: selectedRegistration.rawPayload || selectedRegistration,
          children: selectedRegistration.children.flatMap((child) =>
            mappedOptions.map((mappedOption) => ({
              ...child,
              programId: matchingMapping.programId,
              sourceOptionText: mappedOption.sourceOptionText,
              batchNumber: mappedOption.batchNumber,
              priceType: importForm.priceType,
              priceAmount: child.priceAmount || splitAmount,
            }))
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');
      await uploadProof(proofFile, {
        importId: data.import?.id || '',
        paymentRecordId: data.import?.paymentRecords?.[0]?.id || '',
        note: importForm.paymentProofNote || 'Proof attached during confirmed registration import',
      });
      setMessage({ type: 'success', text: data.duplicate ? 'This registration was already imported.' : 'Paid registration imported successfully.' });
      setSelectedRegistration(null);
      setSelectedFamilyId('');
      setProofFile(null);
      setImportForm({ priceType: 'FULL_PRICE', confirmedAmount: 0, paymentProofNote: '' });
      await Promise.all([loadImports(), mutateFamilies()]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Import failed' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveMapping = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    try {
      const isEditing = Boolean(mappingForm.id);
      const response = await fetchWithAuth(
        isEditing ? `/api/fluent-form-mappings/${mappingForm.id}` : '/api/fluent-form-mappings',
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify(mappingForm),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save mapping');
      setMappingForm({
        id: '',
        formId: '',
        formName: '',
        programId: '',
        leadTag: '',
        paidTag: '',
        removeLeadTagOnPaid: false,
        isActive: true,
        optionMappings: [{ sourceOptionText: '', batchNumber: 1, isActive: true }],
      });
      setMessage({ type: 'success', text: 'Form mapping saved.' });
      await loadMappings();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save mapping' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleExistingFamilyEnrollment = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    try {
      const response = await fetchWithAuth(`/api/families/${existingFamilyForm.familyId}/paid-enrollments`, {
        method: 'POST',
        body: JSON.stringify({
          programId: existingFamilyForm.programId,
          batchNumber: existingFamilyForm.batchNumber,
          confirmedAmount: Number(existingFamilyForm.confirmedAmount),
          paidTag: existingFamilyForm.paidTag,
          paymentProofNote: existingFamilyForm.paymentProofNote,
          children: [
            existingFamilyForm.existingStudentId
              ? { existingStudentId: existingFamilyForm.existingStudentId, priceType: existingFamilyForm.priceType, priceAmount: Number(existingFamilyForm.confirmedAmount) }
              : {
                  firstName: existingFamilyForm.firstName,
                  lastName: existingFamilyForm.lastName,
                  dateOfBirth: existingFamilyForm.dateOfBirth || null,
                  priceType: existingFamilyForm.priceType,
                  priceAmount: Number(existingFamilyForm.confirmedAmount),
                },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add paid enrollment');
      await uploadProof(proofFile, {
        paymentRecordId: data.records?.[0]?.id || '',
        enrollmentId: data.records?.[0]?.enrollmentId || '',
        note: existingFamilyForm.paymentProofNote,
      });
      setMessage({ type: 'success', text: 'Paid enrollment added to existing family.' });
      setProofFile(null);
      setExistingFamilyForm((current) => ({
        ...current,
        existingStudentId: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        confirmedAmount: 0,
        paymentProofNote: '',
      }));
      await Promise.all([loadImports(), mutateFamilies()]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to add paid enrollment' });
    } finally {
      setIsBusy(false);
    }
  };

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'import', label: 'Import Paid Registration', icon: <FiDatabase /> },
    { id: 'existing-family', label: 'Existing Family Enrollment', icon: <FiUsers /> },
    { id: 'mappings', label: 'Form Mappings', icon: <FiSettings /> },
    { id: 'history', label: 'Import History', icon: <FiCreditCard /> },
  ];

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Paid imports</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{imports.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">CRM failures</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{imports.filter((item) => item.crmSyncStatus === 'FAILED').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Active mappings</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{mappings.filter((item) => item.isActive).length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Existing families</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{families.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <SectionCard>
            <Header title="Search WordPress registrations" subtitle="Fetch Fluent Forms submissions without saving unpaid registrations in the CMS." icon={<FiSearch className="h-5 w-5" />} />
            <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-2">
              <input value={search.email} onChange={(event) => setSearch((current) => ({ ...current, email: event.target.value }))} placeholder="Parent email" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
              <input value={search.phone} onChange={(event) => setSearch((current) => ({ ...current, phone: event.target.value }))} placeholder="Parent phone" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
              <input value={search.submissionId} onChange={(event) => setSearch((current) => ({ ...current, submissionId: event.target.value }))} placeholder="Submission ID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300" />
              <select value={search.formId} onChange={(event) => setSearch((current) => ({ ...current, formId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300">
                <option value="">All mapped forms</option>
                {mappings.map((mapping) => <option key={mapping.id} value={mapping.formId}>{mapping.formName}</option>)}
              </select>
              <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white md:col-span-2">
                <FiSearch /> {isBusy ? 'Searching...' : 'Search registrations'}
              </button>
            </form>

            <div className="space-y-3 border-t border-slate-100 p-5">
              {searchResults.map((result) => (
                <button
                  key={`${result.sourceFormId}-${result.sourceSubmissionId}`}
                  type="button"
                  onClick={() => {
                    setSelectedRegistration(result);
                    setSelectedFamilyId(result.matchingFamilies?.[0]?.id || '');
                    setImportForm((current) => ({
                      ...current,
                      confirmedAmount: result.expectedAmount || current.confirmedAmount || 0,
                    }));
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedRegistration?.sourceSubmissionId === result.sourceSubmissionId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{result.parentFirstName} {result.parentLastName}</p>
                      <p className="mt-1 text-sm text-slate-500">{result.parentEmail || result.parentPhone || 'No contact shown'} · Submission {result.sourceSubmissionId}</p>
                    </div>
                    <Pill className={result.matchingFamilies?.length ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                      {result.matchingFamilies?.length ? 'Existing family found' : 'New family'}
                    </Pill>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{result.children.length} child{result.children.length === 1 ? '' : 'ren'} · Expected {formatCurrency(result.expectedAmount)}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <Header title="Confirm and import" subtitle="Only click import after bank transfer payment has been confirmed." icon={<FiCheckCircle className="h-5 w-5" />} />
            <div className="space-y-4 p-5">
              {!selectedRegistration ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Select a registration search result to preview and import.
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-bold text-slate-500">Parent</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{selectedRegistration.parentFirstName} {selectedRegistration.parentLastName}</p>
                    <p className="text-sm text-slate-500">{selectedRegistration.parentEmail || selectedRegistration.parentPhone}</p>
                  </div>
                  {selectedRegistration.matchingFamilies && selectedRegistration.matchingFamilies.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Matching family</label>
                      <select value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="">Create new family</option>
                        {selectedRegistration.matchingFamilies.map((family) => <option key={family.id} value={family.id}>{family.displayName}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-200">
                    {selectedRegistration.children.map((child, index) => (
                      <div key={`${child.firstName}-${child.lastName}-${index}`} className="border-b border-slate-100 p-4 last:border-b-0">
                        <p className="font-bold text-slate-950">{child.firstName} {child.lastName}</p>
                        <p className="mt-1 text-sm text-slate-500">{child.courseName || matchingMapping?.program?.name || 'No course shown'}</p>
                      </div>
                    ))}
                  </div>
                  {!matchingMapping && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">No active form mapping exists for form {selectedRegistration.sourceFormId}.</p>}
                  {matchingMapping && (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-bold text-slate-700">Selected date/batch options</p>
                      {mappedSelectedOptions.length === 0 ? (
                        <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">No selected date/batch option was found in this WordPress registration.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {mappedSelectedOptions.map((item) => (
                            <div key={item.optionText} className={`rounded-xl border p-3 text-sm ${item.mapping ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                              <p className="font-semibold">{item.optionText}</p>
                              <p className="mt-1">{item.mapping ? `Maps to CMS Batch ${item.mapping.batchNumber}` : 'Not mapped yet. Update Form Mappings before importing.'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">Confirmed price option</span>
                      <select value={importForm.priceType} onChange={(event) => setImportForm((current) => ({ ...current, priceType: event.target.value as PriceType }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
                        {priceTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-700">Confirmed amount paid</span>
                      <input type="number" min={1} value={importForm.confirmedAmount || ''} onChange={(event) => setImportForm((current) => ({ ...current, confirmedAmount: Number(event.target.value) }))} placeholder="Confirmed amount" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Payment proof note</span>
                    <textarea value={importForm.paymentProofNote} onChange={(event) => setImportForm((current) => ({ ...current, paymentProofNote: event.target.value }))} placeholder="Bank transfer confirmation note" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">Payment proof file</span>
                    <input type="file" accept="image/*,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  </label>
                  <button disabled={isBusy || !matchingMapping || hasUnmappedSelectedOptions || mappedSelectedOptions.length === 0} onClick={handleImport} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                    <FiUpload /> Import paid registration
                  </button>
                </>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'existing-family' && (
        <SectionCard>
          <Header title="Add paid enrollment to existing family" subtitle="Use this for returning customers or existing families. No Fluent Forms import is needed." icon={<FiUsers className="h-5 w-5" />} />
          <form onSubmit={handleExistingFamilyEnrollment} className="grid gap-4 p-5 lg:grid-cols-2">
            <select required value={existingFamilyForm.familyId} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, familyId: event.target.value, existingStudentId: '' }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">Choose family</option>
              {families.map((family) => <option key={family.id} value={family.id}>{family.displayName}</option>)}
            </select>
            <select value={existingFamilyForm.existingStudentId} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, existingStudentId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" disabled={!selectedFamily}>
              <option value="">Add new sibling or choose existing child</option>
              {selectedFamily?.students?.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
            </select>
            {!existingFamilyForm.existingStudentId && (
              <>
                <input value={existingFamilyForm.firstName} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, firstName: event.target.value }))} placeholder="New child first name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                <input value={existingFamilyForm.lastName} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, lastName: event.target.value }))} placeholder="New child last name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                <input type="date" value={existingFamilyForm.dateOfBirth} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, dateOfBirth: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              </>
            )}
            <select required value={existingFamilyForm.programId} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, programId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">Choose program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            </select>
            <input type="number" min={1} value={existingFamilyForm.batchNumber} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, batchNumber: Number(event.target.value) }))} placeholder="Batch" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <select value={existingFamilyForm.priceType} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, priceType: event.target.value as PriceType }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              {priceTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
            </select>
            <input required type="number" min={1} value={existingFamilyForm.confirmedAmount || ''} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, confirmedAmount: Number(event.target.value) }))} placeholder="Confirmed amount" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <input value={existingFamilyForm.paidTag} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, paidTag: event.target.value }))} placeholder="FluentCRM paid tag" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <textarea value={existingFamilyForm.paymentProofNote} onChange={(event) => setExistingFamilyForm((current) => ({ ...current, paymentProofNote: event.target.value }))} placeholder="Payment proof note" className="rounded-xl border border-slate-200 px-4 py-3 text-sm lg:col-span-2" />
            <input type="file" accept="image/*,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm lg:col-span-2" />
            <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white lg:col-span-2">
              <FiCheckCircle /> Add confirmed paid enrollment
            </button>
          </form>
        </SectionCard>
      )}

      {activeTab === 'mappings' && (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <SectionCard>
            <Header title="Form mapping" subtitle="Map one Fluent Form to a CMS program, then map each selected date option to the right batch." icon={<FiSettings className="h-5 w-5" />} />
            <form onSubmit={handleSaveMapping} className="grid gap-4 p-5">
              <input required value={mappingForm.formId} onChange={(event) => setMappingForm((current) => ({ ...current, formId: event.target.value }))} placeholder="Fluent Form ID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <input required value={mappingForm.formName} onChange={(event) => setMappingForm((current) => ({ ...current, formName: event.target.value }))} placeholder="Form name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <select required value={mappingForm.programId} onChange={(event) => setMappingForm((current) => ({ ...current, programId: event.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <option value="">Choose program</option>
                {programs.map((program: Program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
              <input value={mappingForm.leadTag} onChange={(event) => setMappingForm((current) => ({ ...current, leadTag: event.target.value }))} placeholder="Lead tag" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <input required value={mappingForm.paidTag} onChange={(event) => setMappingForm((current) => ({ ...current, paidTag: event.target.value }))} placeholder="Paid tag" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Date/batch option mappings</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Paste the exact option text from Fluent Forms, then choose the CMS batch it represents.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMappingForm((current) => ({
                      ...current,
                      optionMappings: [...current.optionMappings, { sourceOptionText: '', batchNumber: 1, isActive: true }],
                    }))}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <FiPlus /> Add option
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {mappingForm.optionMappings.map((option, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-3">
                      <label className="block w-full">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Fluent Forms option text</span>
                        <input
                          required
                          value={option.sourceOptionText}
                          onChange={(event) => setMappingForm((current) => ({
                            ...current,
                            optionMappings: current.optionMappings.map((currentOption, currentIndex) =>
                              currentIndex === index ? { ...currentOption, sourceOptionText: event.target.value } : currentOption
                            ),
                          }))}
                          placeholder="e.g. July 27th – August 7th. 9am – 11am"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">CMS batch</span>
                          <input
                            required
                            type="number"
                            min={1}
                            value={option.batchNumber}
                            onChange={(event) => setMappingForm((current) => ({
                              ...current,
                              optionMappings: current.optionMappings.map((currentOption, currentIndex) =>
                                currentIndex === index ? { ...currentOption, batchNumber: Number(event.target.value) } : currentOption
                              ),
                            }))}
                            aria-label="CMS batch number"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="flex items-center gap-2 pb-3 text-sm font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={option.isActive}
                            onChange={(event) => setMappingForm((current) => ({
                              ...current,
                              optionMappings: current.optionMappings.map((currentOption, currentIndex) =>
                                currentIndex === index ? { ...currentOption, isActive: event.target.checked } : currentOption
                              ),
                            }))}
                          />
                          Active
                        </label>
                        <button
                          type="button"
                          onClick={() => setMappingForm((current) => ({
                            ...current,
                            optionMappings: current.optionMappings.length > 1
                              ? current.optionMappings.filter((_, currentIndex) => currentIndex !== index)
                              : current.optionMappings,
                          }))}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-100 bg-white px-3 py-3 text-rose-600"
                          aria-label="Remove option mapping"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={mappingForm.isActive} onChange={(event) => setMappingForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active</label>
              <button disabled={isBusy} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">{mappingForm.id ? 'Update mapping' : 'Create mapping'}</button>
            </form>
          </SectionCard>

          <SectionCard>
            <Header title="Mapped forms" subtitle="These mappings decide the CMS program, batch routing, and paid tag used during import." icon={<FiLink className="h-5 w-5" />} />
            <div className="divide-y divide-slate-100">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-bold text-slate-950">{mapping.formName}</p>
                    <p className="mt-1 text-sm text-slate-500">Form {mapping.formId} · {mapping.program?.name} · {mapping.optionMappings?.length || 0} option mapping{mapping.optionMappings?.length === 1 ? '' : 's'}</p>
                    <p className="mt-1 text-sm text-slate-500">Paid tag: {mapping.paidTag}</p>
                    <div className="mt-3 space-y-1">
                      {mapping.optionMappings?.map((option) => (
                        <p key={option.id || option.sourceOptionText} className="text-xs text-slate-500">
                          Batch {option.batchNumber}: {option.sourceOptionText}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className={mapping.isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>{mapping.isActive ? 'Active' : 'Inactive'}</Pill>
                    <button
                      type="button"
                      onClick={() => setMappingForm({
                        id: mapping.id,
                        formId: mapping.formId,
                        formName: mapping.formName,
                        programId: mapping.programId,
                        leadTag: mapping.leadTag || '',
                        paidTag: mapping.paidTag,
                        removeLeadTagOnPaid: mapping.removeLeadTagOnPaid,
                        isActive: mapping.isActive,
                        optionMappings: mapping.optionMappings?.length
                          ? mapping.optionMappings.map((option) => ({
                              sourceOptionText: option.sourceOptionText,
                              batchNumber: option.batchNumber,
                              isActive: option.isActive,
                            }))
                          : [{ sourceOptionText: '', batchNumber: 1, isActive: true }],
                      })}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'history' && (
        <SectionCard>
          <Header title="Paid import history" subtitle="Only paid/imported customers appear here." icon={<FiCreditCard className="h-5 w-5" />} />
          <div className="overflow-x-auto p-5">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Children</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">CRM</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-bold text-slate-950">{item.parentFirstName} {item.parentLastName}<p className="mt-1 font-normal text-slate-500">{item.parentEmail || item.parentPhone}</p></td>
                    <td className="px-4 py-4 text-slate-600">{item.program?.name}</td>
                    <td className="px-4 py-4 text-slate-600">{item.children?.length || 0}</td>
                    <td className="px-4 py-4 text-slate-600">{formatCurrency(item.confirmedAmount)}</td>
                    <td className="px-4 py-4"><Pill className={statusClass(item.crmSyncStatus)}>{formatLabel(item.crmSyncStatus)}</Pill></td>
                    <td className="px-4 py-4">
                      {item.paymentRecords?.[0] && (
                        <button
                          type="button"
                          onClick={async () => {
                            setIsBusy(true);
                            await fetchWithAuth(`/api/payment-records/${item.paymentRecords?.[0].id}/sync-crm`, { method: 'POST' });
                            await loadImports();
                            setIsBusy(false);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          <FiRefreshCw /> Retry CRM
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
