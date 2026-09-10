'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiDatabase,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getBatchEnrollmentAvailability } from '@/lib/program-enrollment-availability';
import type { Family, ParentGuardian, PriceOption, Program, ProgramEnrollment, Student } from '@/types';

type SearchFamily = Family & {
  students?: Array<Student & {
    enrollments?: Array<Pick<ProgramEnrollment, 'id' | 'programId' | 'batchNumber' | 'status' | 'paymentStatus'>>;
  }>;
};

type HistoricalRegistration = {
  sourceFormId: string;
  sourceSubmissionId: string;
  submittedAt?: string | null;
  parentFirstName: string;
  parentLastName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentPhoneCountryCode?: string | null;
  children: Array<{
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    phoneCountryCode?: string | null;
    dateOfBirth?: string | null;
  }>;
  matchingFamilies?: SearchFamily[];
};

type GuardianDraft = {
  id?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  updateFields: string[];
};

type StudentDraft = {
  key: string;
  existingStudentId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  dateOfBirth: string;
  updateFields: string[];
  fromWordPressHistory: boolean;
};

type EnrollmentDraft = {
  studentKey: string;
  batchNumber: number;
  priceType: string;
  amountConfirmed: number;
};

type SearchResponse = {
  cmsFamilies: SearchFamily[];
  wordpressResults: HistoricalRegistration[];
  wordpressLookupAttempted: boolean;
  wordpressError?: string | null;
  hint?: string | null;
};

type CompletionResult = {
  importId: string;
  enrollmentCount: number;
  totalAmount: number;
  crm: { status: string; error?: string | null };
  confirmation: { success: boolean; skipped: boolean; error?: string | null };
  proofError?: string | null;
};

const blankGuardian = (): GuardianDraft => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  phoneCountryCode: 'NG',
  updateFields: [],
});

const newStudent = (fromWordPressHistory = false): StudentDraft => ({
  key: `student-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  phoneCountryCode: 'NG',
  dateOfBirth: '',
  updateFields: [],
  fromWordPressHistory,
});

function primaryGuardian(family: SearchFamily | null): ParentGuardian | null {
  return family?.guardians.find((guardian) => guardian.isPrimary && guardian.isActive)
    || family?.guardians.find((guardian) => guardian.isActive)
    || family?.guardians[0]
    || null;
}

function dateValue(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function currency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function statusTone(status?: string) {
  if (status === 'SYNCED' || status === 'SENT') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'FAILED') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}

async function uploadProof(file: File, importId: string, note: string) {
  const body = new FormData();
  body.append('file', file);
  body.append('importId', importId);
  if (note) body.append('note', note);
  const response = await fetchWithAuth('/api/payment-proofs', { method: 'POST', body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Payment proof upload failed');
}

export function ReturningCustomerEnrollment({
  programs,
  priceOptions,
  canManageOverrides,
  onCompleted,
}: {
  programs: Program[];
  priceOptions: PriceOption[];
  canManageOverrides: boolean;
  onCompleted: () => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [submissionQuery, setSubmissionQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [familyMode, setFamilyMode] = useState<'existing' | 'new'>('new');
  const [selectedFamily, setSelectedFamily] = useState<SearchFamily | null>(null);
  const [historyMatches, setHistoryMatches] = useState<SearchFamily[]>([]);
  const [historicalReference, setHistoricalReference] = useState<{ formId: string; submissionId: string; submittedAt?: string | null } | null>(null);
  const [guardian, setGuardian] = useState<GuardianDraft>(blankGuardian);
  const [students, setStudents] = useState<StudentDraft[]>([]);
  const [programId, setProgramId] = useState('');
  const [enrollments, setEnrollments] = useState<EnrollmentDraft[]>([]);
  const [closedBatchOverrideReason, setClosedBatchOverrideReason] = useState('');
  const [reactivateFamily, setReactivateFamily] = useState(false);
  const [paymentProofNote, setPaymentProofNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);

  const selectedProgram = programs.find((program) => program.id === programId) || null;
  const totalAmount = enrollments.reduce((sum, row) => sum + (Number(row.amountConfirmed) || 0), 0);
  const selectedClosedBatches = useMemo(() => {
    if (!selectedProgram) return [];
    return [...new Set(enrollments.map((row) => row.batchNumber))].filter(
      (batch) => !getBatchEnrollmentAvailability(selectedProgram, batch).allowed
    );
  }, [enrollments, selectedProgram]);

  const reset = () => {
    setStep(1);
    setQuery('');
    setSubmissionQuery('');
    setSearchResponse(null);
    setFamilyMode('new');
    setSelectedFamily(null);
    setHistoryMatches([]);
    setHistoricalReference(null);
    setGuardian(blankGuardian());
    setStudents([]);
    setProgramId('');
    setEnrollments([]);
    setClosedBatchOverrideReason('');
    setReactivateFamily(false);
    setPaymentProofNote('');
    setProofFile(null);
    setSendConfirmation(true);
    setCompletion(null);
    setMessage(null);
  };

  const selectFamily = (family: SearchFamily, historical?: HistoricalRegistration | null) => {
    const currentGuardian = primaryGuardian(family);
    setFamilyMode('existing');
    setSelectedFamily(family);
    setReactivateFamily(false);
    setGuardian({
      id: currentGuardian?.id,
      firstName: historical?.parentFirstName || currentGuardian?.firstName || '',
      lastName: historical?.parentLastName || currentGuardian?.lastName || '',
      email: historical?.parentEmail || currentGuardian?.email || '',
      phone: historical?.parentPhone || currentGuardian?.phone || '',
      phoneCountryCode: historical?.parentPhoneCountryCode || currentGuardian?.phoneCountryCode || 'NG',
      updateFields: [],
    });

    if (historical) {
      setStudents(historical.children.map((child, index) => {
        const matchingStudent = family.students?.find(
          (student) => normalizeName(`${student.firstName} ${student.lastName}`) === normalizeName(`${child.firstName} ${child.lastName}`)
        );
        return {
          key: `history-${historical.sourceFormId}-${historical.sourceSubmissionId}-${index}`,
          existingStudentId: matchingStudent?.id || null,
          firstName: child.firstName,
          lastName: child.lastName,
          email: child.email || matchingStudent?.email || '',
          phone: child.phone || matchingStudent?.phone || '',
          phoneCountryCode: child.phoneCountryCode || matchingStudent?.phoneCountryCode || 'NG',
          dateOfBirth: dateValue(child.dateOfBirth || matchingStudent?.dateOfBirth),
          updateFields: [],
          fromWordPressHistory: true,
        };
      }));
    } else {
      setStudents((family.students || []).map((student) => ({
        key: `cms-${student.id}`,
        existingStudentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email || '',
        phone: student.phone || '',
        phoneCountryCode: student.phoneCountryCode || 'NG',
        dateOfBirth: dateValue(student.dateOfBirth),
        updateFields: [],
        fromWordPressHistory: false,
      })));
    }
    setStep(2);
    setMessage(null);
  };

  const selectHistory = (registration: HistoricalRegistration) => {
    setHistoricalReference({
      formId: registration.sourceFormId,
      submissionId: registration.sourceSubmissionId,
      submittedAt: registration.submittedAt,
    });
    const matches = registration.matchingFamilies || [];
    setHistoryMatches(matches);
    if (matches.length > 0) {
      selectFamily(matches[0], registration);
      return;
    }
    setFamilyMode('new');
    setSelectedFamily(null);
    setGuardian({
      firstName: registration.parentFirstName,
      lastName: registration.parentLastName,
      email: registration.parentEmail || '',
      phone: registration.parentPhone || '',
      phoneCountryCode: registration.parentPhoneCountryCode || 'NG',
      updateFields: [],
    });
    setStudents(registration.children.map((child, index) => ({
      key: `history-${registration.sourceFormId}-${registration.sourceSubmissionId}-${index}`,
      firstName: child.firstName,
      lastName: child.lastName,
      email: child.email || '',
      phone: child.phone || '',
      phoneCountryCode: child.phoneCountryCode || 'NG',
      dateOfBirth: dateValue(child.dateOfBirth),
      updateFields: [],
      fromWordPressHistory: true,
    })));
    setStep(2);
    setMessage(null);
  };

  const startManual = () => {
    setFamilyMode('new');
    setSelectedFamily(null);
    setHistoryMatches([]);
    setHistoricalReference(null);
    setGuardian(blankGuardian());
    setStudents([newStudent()]);
    setStep(2);
    setMessage(null);
  };

  const runSearch = async (searchQuery: string, kind: 'contact' | 'submission') => {
    setIsBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), kind });
      const response = await fetchWithAuth(`/api/returning-customers/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setSearchResponse(data);
      if (!data.cmsFamilies?.length && !data.wordpressResults?.length) {
        setMessage({ type: 'error', text: 'No matching customer was found. You can enter the family manually.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Search failed' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    await runSearch(query, 'contact');
  };

  const handleSubmissionSearch = async (event: FormEvent) => {
    event.preventDefault();
    await runSearch(submissionQuery, 'submission');
  };

  const updateGuardianField = (field: keyof Omit<GuardianDraft, 'updateFields'>, value: string) => {
    setGuardian((current) => ({
      ...current,
      [field]: value,
      updateFields: familyMode === 'existing' && !current.updateFields.includes(field)
        ? [...current.updateFields, field]
        : current.updateFields,
    }));
  };

  const updateStudent = (key: string, field: keyof StudentDraft, value: string) => {
    setStudents((current) => current.map((student) => {
      if (student.key !== key) return student;
      const updateFields = student.existingStudentId && !student.updateFields.includes(field)
        ? [...student.updateFields, field]
        : student.updateFields;
      return { ...student, [field]: value, updateFields };
    }));
  };

  const matchStudent = (key: string, studentId: string) => {
    const matched = selectedFamily?.students?.find((student) => student.id === studentId);
    setStudents((current) => current.map((student) => student.key === key
      ? {
          ...student,
          existingStudentId: studentId || null,
          ...(matched ? {
            firstName: matched.firstName,
            lastName: matched.lastName,
            email: matched.email || '',
            phone: matched.phone || '',
            phoneCountryCode: matched.phoneCountryCode || 'NG',
            dateOfBirth: dateValue(matched.dateOfBirth),
            updateFields: [],
          } : {}),
        }
      : student));
  };

  const toggleEnrollment = (studentKey: string, batchNumber: number) => {
    const existing = enrollments.find((row) => row.studentKey === studentKey && row.batchNumber === batchNumber);
    if (existing) {
      setEnrollments((current) => current.filter((row) => row !== existing));
      return;
    }
    const defaultPrice = priceOptions[0];
    setEnrollments((current) => [...current, {
      studentKey,
      batchNumber,
      priceType: defaultPrice?.type || 'FULL_PRICE',
      amountConfirmed: defaultPrice?.amount || 0,
    }]);
  };

  const validateProfile = () => {
    if (!guardian.firstName.trim() || !guardian.lastName.trim() || (!guardian.email.trim() && !guardian.phone.trim())) {
      setMessage({ type: 'error', text: 'Enter the guardian name and at least one email or phone number.' });
      return false;
    }
    if (students.length === 0 || students.some((student) => !student.firstName.trim() || !student.lastName.trim())) {
      setMessage({ type: 'error', text: 'Every child needs a first and last name.' });
      return false;
    }
    if (selectedFamily?.isArchived && !reactivateFamily) {
      setMessage({ type: 'error', text: 'This family must be reactivated before enrollment.' });
      return false;
    }
    setMessage(null);
    return true;
  };

  const validateEnrollments = () => {
    if (!selectedProgram || enrollments.length === 0) {
      setMessage({ type: 'error', text: 'Choose a program and at least one child and batch.' });
      return false;
    }
    if (enrollments.some((row) => !row.priceType || !Number.isInteger(row.amountConfirmed) || row.amountConfirmed <= 0)) {
      setMessage({ type: 'error', text: 'Every selected enrollment needs a pricing option and an exact amount.' });
      return false;
    }
    if (selectedClosedBatches.length > 0 && !closedBatchOverrideReason.trim()) {
      setMessage({ type: 'error', text: 'Enter the manager reason for using a closed batch.' });
      return false;
    }
    setMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedProgram || !validateEnrollments()) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const usedStudentKeys = new Set(enrollments.map((row) => row.studentKey));
      const response = await fetchWithAuth('/api/returning-customer-enrollments', {
        method: 'POST',
        body: JSON.stringify({
          familyMode,
          familyId: selectedFamily?.id,
          reactivateFamily,
          guardian,
          students: students.filter((student) => usedStudentKeys.has(student.key)),
          programId: selectedProgram.id,
          enrollments,
          paymentProofNote,
          sendConfirmation: Boolean(guardian.email.trim()) && sendConfirmation,
          closedBatchOverrideReason,
          historicalReference,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create returning customer enrollment');

      let proofError: string | null = null;
      if (proofFile) {
        try {
          await uploadProof(proofFile, data.importId, paymentProofNote);
        } catch (error) {
          proofError = error instanceof Error ? error.message : 'Payment proof upload failed';
        }
      }
      setCompletion({ ...data, proofError });
      setMessage({
        type: proofError ? 'error' : 'success',
        text: proofError
          ? `The paid enrollments were saved, but the proof file was not attached: ${proofError}`
          : 'The returning customer payment and enrollments were saved successfully.',
      });
      await onCompleted();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create returning customer enrollment' });
    } finally {
      setIsBusy(false);
    }
  };

  const steps = ['Find customer', 'Review family', 'Paid enrollments', 'Confirm'];

  if (completion) {
    return (
      <div className="space-y-5 p-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <FiCheckCircle className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="font-bold text-emerald-950">Returning customer enrolled</h3>
              <p className="mt-1 text-sm text-emerald-800">{completion.enrollmentCount} confirmed paid enrollment{completion.enrollmentCount === 1 ? '' : 's'} · {currency(completion.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-xl border p-4 ${statusTone(completion.crm.status)}`}>
            <p className="text-xs font-bold uppercase">FluentCRM</p>
            <p className="mt-2 font-bold">{completion.crm.status}</p>
            {completion.crm.error && <p className="mt-1 text-xs">{completion.crm.error}</p>}
          </div>
          <div className={`rounded-xl border p-4 ${completion.confirmation.skipped ? 'border-slate-200 bg-slate-50 text-slate-700' : statusTone(completion.confirmation.success ? 'SENT' : 'FAILED')}`}>
            <p className="text-xs font-bold uppercase">Parent email</p>
            <p className="mt-2 font-bold">{completion.confirmation.skipped ? 'Not requested' : completion.confirmation.success ? 'Sent' : 'Failed'}</p>
            {completion.confirmation.error && <p className="mt-1 text-xs">{completion.confirmation.error}</p>}
          </div>
          <div className={`rounded-xl border p-4 ${completion.proofError ? statusTone('FAILED') : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
            <p className="text-xs font-bold uppercase">Payment proof</p>
            <p className="mt-2 font-bold">{proofFile ? completion.proofError ? 'Upload failed' : 'Attached' : 'Not provided'}</p>
          </div>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">
          <FiPlus /> Enroll another returning customer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-4">
        {steps.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const done = number < step;
          return (
            <div key={label} className="flex items-center gap-2 py-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>
                {done ? <FiCheck /> : number}
              </span>
              <span className={`text-xs font-bold ${active ? 'text-slate-950' : 'text-slate-500'}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {message && (
        <div className={`mx-5 mt-5 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.text}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5 p-5">
          <div>
            <h3 className="font-bold text-slate-950">Find a returning customer</h3>
            <p className="mt-1 text-sm text-slate-500">Search the CMS and WordPress history using details the customer can provide.</p>
          </div>
          <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required minLength={3} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Parent or child name, email, or phone number" aria-label="Search returning customers" className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm" />
            </div>
            <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              <FiSearch /> {isBusy ? 'Searching...' : 'Search'}
            </button>
          </form>

          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Advanced: search by WordPress submission ID</summary>
            <form onSubmit={handleSubmissionSearch} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input required minLength={3} value={submissionQuery} onChange={(event) => setSubmissionQuery(event.target.value)} placeholder="WordPress submission ID" aria-label="WordPress submission ID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
              <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
                <FiSearch /> Search ID
              </button>
            </form>
          </details>

          {searchResponse?.hint && <p className="text-sm text-slate-500">{searchResponse.hint}</p>}
          {searchResponse?.wordpressError && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <FiAlertCircle className="mt-0.5 shrink-0" /> CMS results are available, but WordPress history could not be searched: {searchResponse.wordpressError}
            </div>
          )}

          {searchResponse && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2"><FiDatabase className="text-blue-600" /><h3 className="font-bold text-slate-950">Existing CMS families</h3></div>
                <div className="space-y-3">
                  {searchResponse.cmsFamilies.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No CMS family matched.</p>}
                  {searchResponse.cmsFamilies.map((family) => {
                    const contact = primaryGuardian(family);
                    return (
                      <button type="button" key={family.id} onClick={() => { setHistoricalReference(null); setHistoryMatches([]); selectFamily(family); }} className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="font-bold text-slate-950">{family.displayName}</p><p className="mt-1 text-sm text-slate-500">{contact?.email || contact?.phone || 'No guardian contact'}</p></div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${family.isArchived ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{family.isArchived ? 'Archived' : 'Active'}</span>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-500">{family.students?.length || 0} child{family.students?.length === 1 ? '' : 'ren'}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2"><FiUsers className="text-violet-600" /><h3 className="font-bold text-slate-950">WordPress history</h3></div>
                <div className="space-y-3">
                  {searchResponse.wordpressResults.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No historical registration matched.</p>}
                  {searchResponse.wordpressResults.map((registration) => (
                    <button type="button" key={`${registration.sourceFormId}-${registration.sourceSubmissionId}`} onClick={() => selectHistory(registration)} className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50">
                      <p className="font-bold text-slate-950">{registration.parentFirstName} {registration.parentLastName}</p>
                      <p className="mt-1 text-sm text-slate-500">{registration.parentEmail || registration.parentPhone}</p>
                      <p className="mt-3 text-xs font-semibold text-slate-500">Historical registration · {registration.children.length} child{registration.children.length === 1 ? '' : 'ren'}</p>
                      {!!registration.matchingFamilies?.length && <p className="mt-2 text-xs font-bold text-blue-700">Matches {registration.matchingFamilies.length} CMS family record{registration.matchingFamilies.length === 1 ? '' : 's'}</p>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5">
            <button type="button" onClick={startManual} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <FiPlus /> Enter family manually
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 p-5">
          {historyMatches.length > 1 && historicalReference && (
            <label className="block max-w-xl">
              <span className="mb-2 block text-sm font-bold text-slate-700">Matching CMS family</span>
              <select value={selectedFamily?.id || ''} onChange={(event) => {
                const family = historyMatches.find((item) => item.id === event.target.value);
                const history = searchResponse?.wordpressResults.find((item) => item.sourceFormId === historicalReference.formId && item.sourceSubmissionId === historicalReference.submissionId);
                if (family && history) selectFamily(family, history);
              }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
                {historyMatches.map((family) => <option key={family.id} value={family.id}>{family.displayName}</option>)}
              </select>
            </label>
          )}

          {selectedFamily?.isArchived && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">This family is archived.</p>
              {canManageOverrides ? (
                <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={reactivateFamily} onChange={(event) => setReactivateFamily(event.target.checked)} /> Reactivate this family when the enrollment is saved</label>
              ) : <p className="mt-2">Ask an admin or superadmin to reactivate it before continuing.</p>}
            </div>
          )}

          <section>
            <h3 className="font-bold text-slate-950">Primary guardian</h3>
            <p className="mt-1 text-sm text-slate-500">Review the current contact details. Editing an existing CMS field marks it for update.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(['firstName', 'lastName', 'email', 'phone'] as const).map((field) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{{ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone' }[field]}</span>
                  <input type={field === 'email' ? 'email' : 'text'} value={guardian[field]} onChange={(event) => updateGuardianField(field, event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  {familyMode === 'existing' && String(primaryGuardian(selectedFamily)?.[field] || '') !== guardian[field] && (
                    <span className="mt-2 block text-xs text-slate-500">
                      Current CMS value: {String(primaryGuardian(selectedFamily)?.[field] || 'Not set')}
                      <span className="mt-1 flex items-center gap-2 font-semibold text-blue-700">
                        <input
                          type="checkbox"
                          checked={guardian.updateFields.includes(field)}
                          onChange={(event) => setGuardian((current) => ({
                            ...current,
                            updateFields: event.target.checked
                              ? [...new Set([...current.updateFields, field])]
                              : current.updateFields.filter((item) => item !== field),
                          }))}
                        />
                        Apply this value to the CMS guardian
                      </span>
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-950">Children</h3><p className="mt-1 text-sm text-slate-500">Match historical children to CMS students or leave them as new children.</p></div><button type="button" onClick={() => setStudents((current) => [...current, newStudent()])} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><FiPlus /> Add child</button></div>
            <div className="mt-4 space-y-3">
              {students.map((student, index) => (
                <div key={student.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Child {index + 1}</p><button type="button" aria-label="Remove child" onClick={() => { setStudents((current) => current.filter((item) => item.key !== student.key)); setEnrollments((current) => current.filter((row) => row.studentKey !== student.key)); }} className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-600"><FiTrash2 /></button></div>
                  {selectedFamily && (
                    <label className="mb-3 block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">CMS student match</span>
                      <select value={student.existingStudentId || ''} onChange={(event) => matchStudent(student.key, event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="">Create as a new child</option>
                        {selectedFamily.students?.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">First name</span>
                      <input value={student.firstName} onChange={(event) => updateStudent(student.key, 'firstName', event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Last name</span>
                      <input value={student.lastName} onChange={(event) => updateStudent(student.key, 'lastName', event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Student email (optional)</span>
                      <input type="email" value={student.email} onChange={(event) => updateStudent(student.key, 'email', event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Date of birth (optional)</span>
                      <input type="date" value={student.dateOfBirth} onChange={(event) => updateStudent(student.key, 'dateOfBirth', event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                  </div>
                  {student.existingStudentId && (() => {
                    const cmsStudent = selectedFamily?.students?.find((item) => item.id === student.existingStudentId);
                    if (!cmsStudent) return null;
                    const differingFields = (['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'] as const).filter((field) => {
                      const currentValue = field === 'dateOfBirth' ? dateValue(cmsStudent.dateOfBirth) : String(cmsStudent[field] || '');
                      return currentValue !== student[field];
                    });
                    if (differingFields.length === 0) return null;
                    const applyAll = differingFields.every((field) => student.updateFields.includes(field));
                    return (
                      <label className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800">
                        <input
                          type="checkbox"
                          checked={applyAll}
                          onChange={(event) => setStudents((current) => current.map((item) => item.key === student.key
                            ? {
                                ...item,
                                updateFields: event.target.checked
                                  ? [...new Set([...item.updateFields, ...differingFields])]
                                  : item.updateFields.filter((field) => !differingFields.includes(field as typeof differingFields[number])),
                              }
                            : item))}
                          className="mt-0.5"
                        />
                        Apply displayed historical changes to this CMS student: {differingFields.join(', ')}
                      </label>
                    );
                  })()}
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-between border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><FiArrowLeft /> Back</button>
            <button type="button" onClick={() => { if (validateProfile()) setStep(3); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Choose enrollments <FiArrowRight /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 p-5">
          <label className="block max-w-2xl"><span className="mb-2 block text-sm font-bold text-slate-700">Current program</span><select value={programId} onChange={(event) => { setProgramId(event.target.value); setEnrollments([]); setClosedBatchOverrideReason(''); }} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">Choose program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name} · {program.year}</option>)}</select></label>

          {selectedProgram && (
            <div className="space-y-4">
              <div><h3 className="font-bold text-slate-950">Children and batches covered by this payment</h3><p className="mt-1 text-sm text-slate-500">Tick only the combinations actually paid for. Closed batches require a manager reason.</p></div>
              {students.map((student) => (
                <div key={student.key} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: selectedProgram.batches }, (_, index) => index + 1).map((batchNumber) => {
                      const availability = getBatchEnrollmentAvailability(selectedProgram, batchNumber);
                      const schedule = selectedProgram.batchSchedules?.find((item) => item.batchNumber === batchNumber);
                      const checked = enrollments.some((row) => row.studentKey === student.key && row.batchNumber === batchNumber);
                      const disabled = !schedule?.paidCrmTag || (!availability.allowed && !canManageOverrides);
                      return (
                        <label key={batchNumber} className={`rounded-xl border p-3 ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70' : checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                          <div className="flex items-start gap-2"><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleEnrollment(student.key, batchNumber)} className="mt-1" /><div><p className="text-sm font-bold text-slate-800">Batch {batchNumber}</p><p className={`mt-1 text-xs font-semibold ${availability.allowed ? 'text-emerald-700' : 'text-amber-700'}`}>{availability.allowed ? 'Open' : 'Closed'}</p><p className={`mt-1 text-xs ${schedule?.paidCrmTag ? 'text-slate-500' : 'font-semibold text-rose-600'}`}>{schedule?.paidCrmTag ? `CRM: ${schedule.paidCrmTag}` : 'CRM tag not configured'}</p></div></div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {enrollments.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Exact amount</th></tr></thead><tbody className="divide-y divide-slate-100">{enrollments.map((row) => { const student = students.find((item) => item.key === row.studentKey)!; return <tr key={`${row.studentKey}-${row.batchNumber}`}><td className="px-4 py-3 font-semibold">{student.firstName} {student.lastName}</td><td className="px-4 py-3">Batch {row.batchNumber}</td><td className="px-4 py-3"><select value={row.priceType} onChange={(event) => { const option = priceOptions.find((item) => item.type === event.target.value); setEnrollments((current) => current.map((item) => item === row ? { ...item, priceType: event.target.value, amountConfirmed: option?.amount || item.amountConfirmed } : item)); }} className="rounded-lg border border-slate-200 px-3 py-2">{priceOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}</select></td><td className="px-4 py-3"><input type="number" min={1} max={10000000} value={row.amountConfirmed || ''} onChange={(event) => setEnrollments((current) => current.map((item) => item === row ? { ...item, amountConfirmed: Number(event.target.value) } : item))} className="w-36 rounded-lg border border-slate-200 px-3 py-2" /></td></tr>; })}</tbody><tfoot><tr className="bg-blue-50 font-bold text-blue-950"><td colSpan={3} className="px-4 py-3">Confirmed total</td><td className="px-4 py-3">{currency(totalAmount)}</td></tr></tfoot></table>
                </div>
              )}
            </div>
          )}

          {selectedClosedBatches.length > 0 && <label className="block"><span className="mb-2 block text-sm font-bold text-amber-900">Closed-batch override reason</span><textarea value={closedBatchOverrideReason} onChange={(event) => setClosedBatchOverrideReason(event.target.value)} placeholder="Explain why this confirmed payment should be enrolled after the normal window closed." className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm" /></label>}
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Payment proof note</span><textarea value={paymentProofNote} onChange={(event) => setPaymentProofNote(event.target.value)} placeholder="Bank transfer or internal confirmation note" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">Payment proof file</span><input type="file" accept="image/*,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" /></label>
          <div className="flex justify-between border-t border-slate-100 pt-5"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><FiArrowLeft /> Back</button><button type="button" onClick={() => { if (validateEnrollments()) setStep(4); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Review payment <FiArrowRight /></button></div>
        </div>
      )}

      {step === 4 && selectedProgram && (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-slate-500">Guardian</p><p className="mt-2 font-bold text-slate-950">{guardian.firstName} {guardian.lastName}</p><p className="mt-1 text-sm text-slate-500">{guardian.email || guardian.phone}</p>{guardian.updateFields.length > 0 && <p className="mt-3 text-xs font-semibold text-blue-600">CMS fields to update: {guardian.updateFields.join(', ')}</p>}</div>
            <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-slate-500">Program and total</p><p className="mt-2 font-bold text-slate-950">{selectedProgram.name} · {selectedProgram.year}</p><p className="mt-1 text-2xl font-bold text-blue-700">{currency(totalAmount)}</p></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">CRM tag</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{enrollments.map((row) => { const student = students.find((item) => item.key === row.studentKey)!; const tag = selectedProgram.batchSchedules?.find((item) => item.batchNumber === row.batchNumber)?.paidCrmTag; return <tr key={`${row.studentKey}-${row.batchNumber}`}><td className="px-4 py-3 font-semibold">{student.firstName} {student.lastName}</td><td className="px-4 py-3">Batch {row.batchNumber}</td><td className="px-4 py-3 text-slate-500">{tag}</td><td className="px-4 py-3 text-right font-semibold">{currency(row.amountConfirmed)}</td></tr>; })}</tbody></table></div>
          {selectedClosedBatches.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Closed batch override: {selectedClosedBatches.map((batch) => `Batch ${batch}`).join(', ')}</p><p className="mt-1">{closedBatchOverrideReason}</p></div>}
          <label className={`flex items-start gap-3 rounded-xl border p-4 ${guardian.email ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 opacity-70'}`}><input type="checkbox" checked={Boolean(guardian.email) && sendConfirmation} disabled={!guardian.email} onChange={(event) => setSendConfirmation(event.target.checked)} className="mt-1" /><div><p className="font-bold text-slate-900">Send enrollment confirmation</p><p className="mt-1 text-sm text-slate-600">{guardian.email ? `Email ${guardian.email} with the children, batches, exact amounts, and confirmed total.` : 'Add a guardian email to enable confirmation.'}</p></div></label>
          <div className="flex justify-between border-t border-slate-100 pt-5"><button type="button" disabled={isBusy} onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><FiArrowLeft /> Back</button><button type="button" disabled={isBusy} onClick={handleSubmit} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><FiCheckCircle /> {isBusy ? 'Saving...' : 'Confirm paid enrollment'}</button></div>
        </div>
      )}
    </div>
  );
}
