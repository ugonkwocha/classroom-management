'use client';

import { useEffect, useState } from 'react';
import { FiAward, FiDownload, FiEye, FiMail } from 'react-icons/fi';
import { Button } from '@/components/ui';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type Certificate = {
  id: string;
  certificateNumber: string;
  courseTitleSnapshot: string;
  classNameSnapshot: string;
  completionDate: string;
  issuedAt: string;
  version: number;
  status: 'ISSUED' | 'REVOKED';
  deliveryStatus?: string | null;
};

export function StudentCertificatesSection({ studentId }: { studentId: string }) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWithAuth(`/api/students/${studentId}/certificates`).then(async (response) => {
      if (response.ok) setCertificates(await response.json());
    });
  }, [studentId]);

  const download = async (certificate: Certificate) => {
    const response = await fetchWithAuth(`/api/certificates/${certificate.id}/download`);
    if (!response.ok) return setMessage('Certificate PDF is unavailable.');
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${certificate.certificateNumber}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  };

  const resend = async (certificate: Certificate) => {
    const response = await fetchWithAuth(`/api/certificates/${certificate.id}/send`, { method: 'POST' });
    const payload = await response.json();
    setMessage(response.ok && payload.success ? `Certificate resent to ${payload.sent} recipient${payload.sent === 1 ? '' : 's'}.` : payload.error || 'Certificate could not be resent.');
  };

  const preview = async (certificate: Certificate) => {
    const response = await fetchWithAuth(`/api/certificates/${certificate.id}/download`);
    if (!response.ok) return setMessage('Certificate PDF is unavailable.');
    const url = URL.createObjectURL(await response.blob());
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-3 text-amber-600"><FiAward /></span><div><h3 className="font-bold text-slate-950">Certificates</h3><p className="text-sm text-slate-500">Completion certificates issued to this student.</p></div></div>
    {message && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p>}
    <div className="mt-4 space-y-3">{certificates.map((certificate) => <div key={certificate.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{certificate.courseTitleSnapshot}</p><p className="mt-1 text-xs text-slate-500">{certificate.certificateNumber} · {new Date(certificate.completionDate).toLocaleDateString()} · {certificate.status} · Delivery {certificate.deliveryStatus || 'not recorded'}</p><p className="mt-1 text-xs text-slate-500">{certificate.classNameSnapshot}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => preview(certificate)}><FiEye /> Preview</Button><Button size="sm" variant="outline" onClick={() => download(certificate)}><FiDownload /> Download</Button>{certificate.status === 'ISSUED' && <Button size="sm" variant="outline" onClick={() => resend(certificate)}><FiMail /> Resend</Button>}</div></div>)}{certificates.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">No certificates issued yet.</p>}</div>
  </section>;
}
