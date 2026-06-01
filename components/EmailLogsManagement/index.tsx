'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiXCircle,
} from 'react-icons/fi';
import type { EmailEventType, EmailLog, EmailLogStatus } from '@/types';

type EmailLogsResponse = {
  logs: EmailLog[];
  summary: Record<EmailLogStatus, number>;
};

const statusStyles: Record<EmailLogStatus, string> = {
  QUEUED: 'border-amber-100 bg-amber-50 text-amber-700',
  SENT: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  FAILED: 'border-rose-100 bg-rose-50 text-rose-700',
  DELIVERED: 'border-blue-100 bg-blue-50 text-blue-700',
  BOUNCED: 'border-orange-100 bg-orange-50 text-orange-700',
};

const eventLabels: Record<EmailEventType, string> = {
  CLASS_ASSIGNMENT: 'Class assignment',
  PREPARATION_INSTRUCTIONS: 'Preparation instructions',
  TEACHER_ASSIGNMENT: 'Tutor assignment',
  USER_INVITATION: 'User invitation',
  PASSWORD_RESET: 'Password reset',
};

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof FiMail;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export function EmailLogsManagement() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [summary, setSummary] = useState<Record<EmailLogStatus, number>>({
    QUEUED: 0,
    SENT: 0,
    FAILED: 0,
    DELIVERED: 0,
    BOUNCED: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (eventFilter !== 'all') params.set('eventType', eventFilter);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [eventFilter, search, statusFilter]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/email-logs${queryString ? `?${queryString}` : ''}`);
      const data: EmailLogsResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to fetch email logs');
      }

      setLogs(data.logs || []);
      setSummary(data.summary);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to fetch email logs' });
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (log: EmailLog) => {
    setResendingId(log.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/email-logs/${log.id}/resend`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend email');
      }

      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.success
          ? `Email resent to ${log.recipientEmail}.`
          : `Resend attempted but did not complete: ${data.notification?.error || 'unknown error'}`,
      });
      await fetchLogs();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to resend email' });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Sent" value={summary.SENT || 0} helper="Accepted by provider" icon={FiCheckCircle} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Failed" value={summary.FAILED || 0} helper="Needs admin attention" icon={FiXCircle} tone="bg-rose-50 text-rose-600" />
        <MetricCard label="Queued" value={summary.QUEUED || 0} helper="Waiting for provider result" icon={FiClock} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Bounced" value={summary.BOUNCED || 0} helper="Requires webhook tracking" icon={FiAlertTriangle} tone="bg-orange-50 text-orange-600" />
      </div>

      {message && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Email Delivery Log</h2>
            <p className="mt-1 text-sm text-slate-500">Track class details, preparation instructions, and provider responses.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 shadow-sm">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recipient or error..."
                className="w-full min-w-52 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="FAILED">Failed</option>
              <option value="SENT">Sent</option>
              <option value="QUEUED">Queued</option>
              <option value="DELIVERED">Delivered</option>
              <option value="BOUNCED">Bounced</option>
            </select>

            <select
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none"
            >
              <option value="all">All events</option>
              <option value="CLASS_ASSIGNMENT">Class assignment</option>
              <option value="PREPARATION_INSTRUCTIONS">Preparation instructions</option>
              <option value="TEACHER_ASSIGNMENT">Tutor assignment</option>
              <option value="USER_INVITATION">User invitation</option>
              <option value="PASSWORD_RESET">Password reset</option>
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-4">Recipient</th>
                <th className="px-5 py-4">Event</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Provider ID</th>
                <th className="px-5 py-4">Error</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    Loading email logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    No email logs match this view.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">{log.recipientName || 'Unnamed recipient'}</p>
                      <p className="mt-1 text-sm text-slate-500">{log.recipientEmail}</p>
                      {log.recipientRole && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{log.recipientRole}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{eventLabels[log.eventType] || formatLabel(log.eventType)}</p>
                      <p className="mt-1 max-w-xs truncate text-sm text-slate-500">{log.subject || 'No subject saved'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[log.status]}`}>
                        {formatLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{log.providerMessageId || 'None'}</td>
                    <td className="px-5 py-4">
                      <p className="max-w-sm text-sm text-slate-500">{log.error || 'None'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      <p>{formatDate(log.createdAt)}</p>
                      {log.sentAt && <p className="mt-1 text-xs text-emerald-600">Sent {formatDate(log.sentAt)}</p>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(log.eventType === 'CLASS_ASSIGNMENT' || log.eventType === 'PREPARATION_INSTRUCTIONS') && (
                        <button
                          type="button"
                          onClick={() => handleResend(log)}
                          disabled={resendingId === log.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiSend className="h-4 w-4" />
                          {resendingId === log.id ? 'Resending' : 'Resend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
