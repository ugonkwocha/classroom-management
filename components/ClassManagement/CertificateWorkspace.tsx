'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAward, FiCheck, FiDownload, FiEye, FiMail, FiRefreshCw, FiSlash, FiX } from 'react-icons/fi';
import { Button } from '@/components/ui';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { PERMISSIONS } from '@/lib/permissions';

type RosterRow = {
  student: { id: string; firstName: string; lastName: string; email?: string | null };
  enrollmentId: string;
  enrollmentStatus: string;
  decision: { outcome: 'COMPLETED' | 'NOT_COMPLETED'; reason?: string | null; reviewedAt: string } | null;
  certificate: { id: string; certificateNumber: string; status: 'ISSUED' | 'REVOKED'; version: number; issuedAt: string; completionDate: string; revocationReason?: string | null; deliveryStatus?: string | null } | null;
  recipients: Array<{ email: string; name: string; role: 'parent' | 'student' }>;
};

type RosterResponse = {
  class: { id: string; name: string; isArchived: boolean; batch: number };
  course: { id: string; name: string; certificateTemplate?: { isActive: boolean } | null };
  program: { id: string; name: string };
  settingsReady: boolean;
  defaultCompletionDate: string;
  defaultDateIsFallback: boolean;
  rows: RosterRow[];
};

export function CertificateWorkspace({ classId, onDataChanged }: { classId: string; onDataChanged?: () => void | Promise<void> }) {
  const { hasPermission, user } = useAuth();
  const canReview = hasPermission(PERMISSIONS.REVIEW_CLASS_COMPLETION);
  const canIssue = hasPermission(PERMISSIONS.ISSUE_CERTIFICATE);
  const canRevoke = hasPermission(PERMISSIONS.REVOKE_CERTIFICATE);
  const canOverrideDate = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [completionDate, setCompletionDate] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/classes/${classId}/certificate-roster`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load completion roster');
      setData(payload);
      setCompletionDate((current) => current || payload.defaultCompletionDate);
      setSelected((current) => current.filter((studentId) => payload.rows.some((row: RosterRow) => row.student.id === studentId && row.decision?.outcome === 'COMPLETED' && row.certificate?.status !== 'ISSUED')));
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load completion roster' });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { loadRoster(); }, [loadRoster]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const counts = useMemo(() => {
    const rows = data?.rows || [];
    return {
      unreviewed: rows.filter((row) => !row.decision).length,
      completed: rows.filter((row) => row.decision?.outcome === 'COMPLETED').length,
      notCompleted: rows.filter((row) => row.decision?.outcome === 'NOT_COMPLETED').length,
      issued: rows.filter((row) => row.certificate?.status === 'ISSUED').length,
      sent: rows.filter((row) => row.certificate && ['SENT', 'DELIVERED'].includes(row.certificate.deliveryStatus || '')).length,
      failed: rows.filter((row) => row.certificate?.deliveryStatus === 'FAILED').length,
    };
  }, [data]);

  const saveDecision = async (row: RosterRow, outcome: 'COMPLETED' | 'NOT_COMPLETED') => {
    const reason = outcome === 'NOT_COMPLETED' ? window.prompt('Optional internal reason for not completing:', row.decision?.reason || '') || '' : '';
    setBusyStudentId(row.student.id);
    setMessage(null);
    try {
      const response = await fetchWithAuth(`/api/classes/${classId}/completion-review`, {
        method: 'POST',
        body: JSON.stringify({ decisions: [{ studentId: row.student.id, enrollmentId: row.enrollmentId, outcome, reason }] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to save completion outcome');
      setMessage({ type: 'success', text: `${row.student.firstName} ${row.student.lastName} marked ${outcome === 'COMPLETED' ? 'Completed' : 'Not completed'}.` });
      await loadRoster();
      await onDataChanged?.();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save completion outcome' });
    } finally { setBusyStudentId(null); }
  };

  const preview = async () => {
    const studentId = selected[0];
    if (!studentId) return;
    setMessage(null);
    try {
      const response = await fetchWithAuth(`/api/classes/${classId}/certificates/preview`, { method: 'POST', body: JSON.stringify({ studentId, completionDate }) });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error || 'Failed to generate preview'); }
      const url = URL.createObjectURL(await response.blob());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to generate preview' }); }
  };

  const issue = async () => {
    setIssuing(true);
    setMessage(null);
    try {
      const response = await fetchWithAuth(`/api/classes/${classId}/certificates/issue`, { method: 'POST', body: JSON.stringify({ studentIds: selected, completionDate }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Certificate issuance failed');
      setResults(payload.results || []);
      setConfirmOpen(false);
      setSelected([]);
      setMessage({ type: payload.success ? 'success' : 'error', text: payload.success ? 'Certificate processing completed. Review the per-student results below.' : 'No certificates were sent. Review the results below.' });
      await loadRoster();
    } catch (error) { setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Certificate issuance failed' }); }
    finally { setIssuing(false); }
  };

  const download = async (certificateId: string, number: string) => {
    const response = await fetchWithAuth(`/api/certificates/${certificateId}/download`);
    if (!response.ok) { setMessage({ type: 'error', text: 'Certificate PDF is unavailable.' }); return; }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${number}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  };

  const viewCertificate = async (certificateId: string) => {
    const response = await fetchWithAuth(`/api/certificates/${certificateId}/download`);
    if (!response.ok) { setMessage({ type: 'error', text: 'Certificate PDF is unavailable.' }); return; }
    const url = URL.createObjectURL(await response.blob());
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const resend = async (certificateId: string) => {
    setBusyStudentId(certificateId);
    const response = await fetchWithAuth(`/api/certificates/${certificateId}/send`, { method: 'POST' });
    const payload = await response.json();
    setMessage({ type: response.ok && payload.success ? 'success' : 'error', text: response.ok && payload.success ? `Certificate resent to ${payload.sent} recipient${payload.sent === 1 ? '' : 's'}.` : payload.error || 'Certificate could not be resent.' });
    setBusyStudentId(null);
  };

  const revoke = async (row: RosterRow) => {
    if (!row.certificate) return;
    const reason = window.prompt('Why is this certificate being revoked?');
    if (!reason?.trim()) return;
    const response = await fetchWithAuth(`/api/certificates/${row.certificate.id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) });
    const payload = await response.json();
    setMessage({ type: response.ok ? 'success' : 'error', text: response.ok ? 'Certificate revoked. It will now fail public verification.' : payload.error || 'Failed to revoke certificate.' });
    if (response.ok) await loadRoster();
  };

  const reissue = async (row: RosterRow) => {
    if (!row.certificate) return;
    const response = await fetchWithAuth(`/api/certificates/${row.certificate.id}/reissue`, { method: 'POST', body: JSON.stringify({ completionDate }) });
    const payload = await response.json();
    setMessage({ type: response.ok ? 'success' : 'error', text: response.ok ? 'A new certificate version was issued and delivery was attempted.' : payload.error || 'Failed to reissue certificate.' });
    if (response.ok) await loadRoster();
  };

  if (loading && !data) return <div className="py-12 text-center text-sm text-slate-500">Loading completion roster...</div>;
  if (!data) return <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Completion roster is unavailable.</div>;

  const eligible = data.rows.filter((row) => row.decision?.outcome === 'COMPLETED' && row.certificate?.status !== 'ISSUED');
  const selectedRows = data.rows.filter((row) => selected.includes(row.student.id));

  return (
    <div className="space-y-5">
      {message && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>{message.text}</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(counts).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></div>)}
      </div>
      {(!data.settingsReady || !data.course.certificateTemplate?.isActive) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Certificate issuance is disabled. {!data.settingsReady ? 'The superadmin must complete Certificate Settings. ' : ''}{!data.course.certificateTemplate?.isActive ? `An admin must activate certificate wording for ${data.course.name}.` : ''}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4"><h3 className="font-bold text-slate-950">Completion review</h3><p className="mt-1 text-sm text-slate-500">Resolve every student before archiving this class.</p></div>
        <div className="divide-y divide-slate-100">
          {data.rows.map((row) => {
            const fullName = `${row.student.firstName} ${row.student.lastName}`;
            return <div key={row.student.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0"><p className="font-semibold text-slate-950">{fullName}</p><p className="mt-1 text-xs text-slate-500">{row.recipients.length ? row.recipients.map((recipient) => `${recipient.role}: ${recipient.email}`).join(' · ') : 'No email recipients available'}</p>{row.decision?.reason && <p className="mt-1 text-xs text-amber-700">Reason: {row.decision.reason}</p>}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${!row.decision ? 'bg-slate-100 text-slate-600' : row.decision.outcome === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{!row.decision ? 'Unreviewed' : row.decision.outcome === 'COMPLETED' ? 'Completed' : 'Not completed'}</span>
                {canReview && <><Button size="sm" variant="outline" onClick={() => saveDecision(row, 'COMPLETED')} disabled={busyStudentId === row.student.id || row.certificate?.status === 'ISSUED'}><FiCheck /> Completed</Button><Button size="sm" variant="outline" onClick={() => saveDecision(row, 'NOT_COMPLETED')} disabled={busyStudentId === row.student.id || row.certificate?.status === 'ISSUED'}><FiX /> Not completed</Button></>}
              </div>
            </div>;
          })}
        </div>
      </section>

      {canIssue && <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-bold text-slate-950">Certificate wizard</h3><p className="mt-1 text-sm text-slate-500">Select completed students, preview, then confirm delivery.</p></div><label className="text-sm font-semibold text-slate-700">Certificate date<input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} disabled={!canOverrideDate} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500" />{!canOverrideDate && <span className="mt-1 block text-xs font-normal text-slate-500">Only admins can override this date.</span>}</label></div>
        {data.defaultDateIsFallback && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">No batch end date is available, so the current fallback date is shown. Admins can override it before issuing.</p>}
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setSelected(eligible.map((row) => row.student.id))}>Select all eligible</Button><Button size="sm" variant="outline" onClick={() => setSelected([])}>Clear</Button><span className="self-center text-sm text-slate-500">{selected.length} selected</span></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{eligible.map((row) => <label key={row.student.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3"><input type="checkbox" checked={selected.includes(row.student.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row.student.id] : current.filter((id) => id !== row.student.id))} /><span className="font-semibold text-slate-800">{row.student.firstName} {row.student.lastName}</span></label>)}</div>
        {eligible.length === 0 && <p className="mt-4 text-sm text-slate-500">No completed students currently need a certificate.</p>}
        <div className="mt-4 flex flex-wrap gap-3"><Button onClick={preview} disabled={!selected.length || !data.settingsReady || !data.course.certificateTemplate?.isActive}><FiEye /> Preview first selected</Button><Button onClick={() => setConfirmOpen(true)} disabled={!selected.length || !completionDate || !data.settingsReady || !data.course.certificateTemplate?.isActive}><FiAward /> Review and issue</Button></div>
        {previewUrl && <iframe title="Certificate preview" src={previewUrl} className="mt-5 aspect-[1.44/1] w-full rounded-xl border border-slate-200" />}
      </section>}

      <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-slate-950">Issued certificates</h3><div className="mt-3 space-y-2">{data.rows.filter((row) => row.certificate).map((row) => <div key={row.certificate!.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{row.student.firstName} {row.student.lastName}</p><p className="text-xs text-slate-500">{row.certificate!.certificateNumber} · Version {row.certificate!.version} · {row.certificate!.status} · Delivery {row.certificate!.deliveryStatus || 'not attempted'}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => viewCertificate(row.certificate!.id)}><FiEye /> Preview</Button><Button size="sm" variant="outline" onClick={() => download(row.certificate!.id, row.certificate!.certificateNumber)}><FiDownload /> Download</Button>{row.certificate!.status === 'ISSUED' && <Button size="sm" variant="outline" onClick={() => resend(row.certificate!.id)} disabled={busyStudentId === row.certificate!.id}><FiMail /> Resend</Button>}{canRevoke && row.certificate!.status === 'ISSUED' && <Button size="sm" variant="danger" onClick={() => revoke(row)}><FiSlash /> Revoke</Button>}{canRevoke && row.certificate!.status === 'REVOKED' && <Button size="sm" onClick={() => reissue(row)}><FiRefreshCw /> Reissue</Button>}</div></div>)}{!data.rows.some((row) => row.certificate) && <p className="text-sm text-slate-500">No certificates have been issued for this class.</p>}</div></section>

      {results.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold">Latest issue results</h3><div className="mt-3 space-y-2">{results.map((result) => { const issued = Boolean(result.certificateId); const sent = Number(result.sent || 0); const failed = Number(result.failed || 0); return <div key={String(result.studentId)} className={`rounded-lg px-3 py-2 text-sm ${issued && failed === 0 ? 'bg-emerald-50 text-emerald-700' : issued ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}><strong>{String(result.studentName)}</strong>: {!issued ? String(result.error || 'issuance failed') : sent > 0 && failed === 0 ? `issued and sent to ${sent} recipient(s)` : sent > 0 ? `issued; sent to ${sent}, failed for ${failed} recipient(s)` : result.generatedForManualDelivery ? 'issued for manual delivery; no recipient email is available' : 'issued, but email delivery failed. Use Resend from the certificate record.'}</div>; })}</div></section>}

      {confirmOpen && typeof document !== 'undefined' && createPortal(<><button className="fixed inset-0 z-[90] bg-slate-950/60" onClick={() => !issuing && setConfirmOpen(false)} aria-label="Close certificate confirmation"/><div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b p-5"><div><h3 className="text-lg font-bold">Issue and send certificates?</h3><p className="mt-1 text-sm text-slate-500">PDFs become immutable academy records.</p></div><button onClick={() => setConfirmOpen(false)} disabled={issuing}><FiX /></button></div><div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">{selectedRows.map((row) => <div key={row.student.id} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold">{row.student.firstName} {row.student.lastName}</p><p className="mt-1 text-xs text-slate-500">{row.recipients.length ? row.recipients.map((recipient) => recipient.email).join(', ') : 'No email: generated for manual delivery'}</p></div>)}<p className="text-sm text-slate-600">Certificate date: <strong>{completionDate}</strong></p></div><div className="flex justify-end gap-3 border-t p-5"><Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={issuing}>Cancel</Button><Button onClick={issue} disabled={issuing}>{issuing ? 'Issuing...' : 'Issue and send'}</Button></div></div></div></>, document.body)}
    </div>
  );
}
