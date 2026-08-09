'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { FiAward, FiCheckCircle, FiXCircle } from 'react-icons/fi';

type Verification = {
  valid: boolean;
  certificateNumber?: string;
  studentNameSnapshot?: string;
  courseTitleSnapshot?: string;
  completionDate?: string;
  issuedAt?: string;
  status?: string;
  error?: string;
};

export default function CertificateVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [result, setResult] = useState<Verification | null>(null);

  useEffect(() => {
    fetch(`/api/certificates/verify/${encodeURIComponent(token)}`)
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ data }) => setResult(data))
      .catch(() => setResult({ valid: false, error: 'Certificate verification is unavailable' }));
  }, [token]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-[#06244a] px-7 py-6">
          <Image src="/brand/9ck-white-full-logo.png" alt="9jacodekids" width={230} height={70} className="h-auto w-52" />
        </div>
        <div className="p-7 sm:p-10">
          {!result ? (
            <p className="text-center text-slate-500">Checking certificate...</p>
          ) : (
            <>
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${result.valid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {result.valid ? <FiCheckCircle className="h-9 w-9" /> : <FiXCircle className="h-9 w-9" />}
              </div>
              <h1 className="mt-5 text-center text-2xl font-bold">{result.valid ? 'Valid certificate' : result.status === 'REVOKED' ? 'Revoked certificate' : 'Certificate not found'}</h1>
              <p className="mt-2 text-center text-sm text-slate-500">9jacodekids Academy certificate verification</p>
              {result.certificateNumber && (
                <dl className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                  <div><dt className="text-xs font-bold uppercase text-slate-400">Student</dt><dd className="mt-1 font-semibold">{result.studentNameSnapshot}</dd></div>
                  <div><dt className="text-xs font-bold uppercase text-slate-400">Course</dt><dd className="mt-1 font-semibold">{result.courseTitleSnapshot}</dd></div>
                  <div><dt className="text-xs font-bold uppercase text-slate-400">Completion date</dt><dd className="mt-1 font-semibold">{result.completionDate ? new Date(result.completionDate).toLocaleDateString() : ''}</dd></div>
                  <div><dt className="text-xs font-bold uppercase text-slate-400">Certificate number</dt><dd className="mt-1 font-semibold">{result.certificateNumber}</dd></div>
                </dl>
              )}
              {!result.certificateNumber && <p className="mt-6 text-center text-rose-600">{result.error}</p>}
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400"><FiAward /> Verified against academy records</div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
