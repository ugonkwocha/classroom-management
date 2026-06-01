'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiMail,
  FiPlus,
  FiPower,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import type { Course, CourseEmailTemplate } from '@/types';
import {
  PREPARATION_TEMPLATE_PLACEHOLDERS,
  renderTemplateHtml,
  renderTemplateText,
  type PreparationTemplateContext,
} from '@/lib/email-template-rendering';

type EmailTemplateRow = {
  course: Course;
  template: CourseEmailTemplate | null;
};

type FormState = {
  courseId: string;
  subject: string;
  body: string;
  isActive: boolean;
};

const defaultBody = `{{#parent}}
Hello {{recipientName}},

{{studentName}} has been assigned to {{className}}.
{{/parent}}

{{#student}}
Hello {{recipientName}},

You have been assigned to {{className}}.
{{/student}}

Course: {{courseName}}
Program: {{programName}}
Schedule: {{schedule}}
Tutor: {{tutorFirstName}}

{{meetButton}}

Please prepare for class with the instructions below:

- Join a few minutes early
- Keep your device charged
- Use a quiet learning space

We look forward to seeing you in class.`;

function sampleContext(courseName: string): PreparationTemplateContext {
  return {
    recipientName: 'Gloria Johnson',
    recipientRole: 'parent',
    parentName: 'Gloria Johnson',
    studentName: 'Ada Johnson',
    courseName,
    className: `${courseName || 'Scratch 101'} - SUMMER 2026 - Batch 1 - Morning 9am - 11am-A`,
    programName: 'Summer 2026',
    schedule: 'Morning 9am - 11am',
    tutorFirstName: 'Joy',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    meetButton: 'https://meet.google.com/abc-defg-hij',
  };
}

function formatDate(value?: string | null) {
  if (!value) return 'Not saved yet';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function TemplateStatus({ template }: { template: CourseEmailTemplate | null }) {
  if (!template) {
    return (
      <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Missing
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        template.isActive
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {template.isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export function EmailTemplatesManagement() {
  const [items, setItems] = useState<EmailTemplateRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CourseEmailTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewAudience, setPreviewAudience] = useState<'parent' | 'student'>('parent');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    courseId: '',
    subject: 'Prepare for {{courseName}}',
    body: defaultBody,
    isActive: true,
  });

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/email-templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch email templates');
      }

      setItems(data.items || []);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to fetch email templates' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return items;

    return items.filter((item) => {
      return (
        item.course.name.toLowerCase().includes(value) ||
        item.template?.subject.toLowerCase().includes(value) ||
        item.template?.body.toLowerCase().includes(value)
      );
    });
  }, [items, search]);

  const selectedCourse = items.find((item) => item.course.id === form.courseId)?.course;
  const previewBaseContext = sampleContext(selectedCourse?.name || '');
  const previewContext = {
    ...previewBaseContext,
    recipientName: previewAudience === 'parent' ? previewBaseContext.parentName : previewBaseContext.studentName,
    recipientRole: previewAudience,
  };
  const previewSubject = renderTemplateText(form.subject, previewContext);
  const previewBody = renderTemplateHtml(form.body, previewContext);
  const configuredCount = items.filter((item) => item.template).length;
  const activeCount = items.filter((item) => item.template?.isActive).length;
  const missingCount = items.filter((item) => !item.template || !item.template.isActive).length;

  const openCreateModal = (courseId = '') => {
    const course = items.find((item) => item.course.id === courseId)?.course;
    setEditingTemplate(null);
    setForm({
      courseId,
      subject: `Prepare for {{courseName}}`,
      body: defaultBody,
      isActive: true,
    });
    if (!course && items.length > 0 && !courseId) {
      setForm((current) => ({ ...current, courseId: items[0].course.id }));
    }
    setMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (row: EmailTemplateRow) => {
    if (!row.template) {
      openCreateModal(row.course.id);
      return;
    }

    setEditingTemplate(row.template);
    setForm({
      courseId: row.course.id,
      subject: row.template.subject,
      body: row.template.body,
      isActive: row.template.isActive,
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const endpoint = editingTemplate ? `/api/email-templates/${editingTemplate.id}` : '/api/email-templates';
      const response = await fetch(endpoint, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setMessage({ type: 'success', text: 'Email template saved.' });
      setIsModalOpen(false);
      await fetchTemplates();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save template' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (row: EmailTemplateRow) => {
    if (!row.template) return;

    setMessage(null);
    try {
      const response = await fetch(`/api/email-templates/${row.template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: row.template.subject,
          body: row.template.body,
          isActive: !row.template.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update template');
      }

      setMessage({ type: 'success', text: row.template.isActive ? 'Template deactivated.' : 'Template activated.' });
      await fetchTemplates();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update template' });
    }
  };

  const handleDelete = async (row: EmailTemplateRow) => {
    if (!row.template) return;
    if (!window.confirm(`Delete the assignment email template for ${row.course.name}?`)) return;

    setMessage(null);
    try {
      const response = await fetch(`/api/email-templates/${row.template.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }

      setMessage({ type: 'success', text: 'Email template deleted.' });
      await fetchTemplates();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete template' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiMail className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Configured emails</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{configuredCount}</p>
          <p className="mt-2 text-sm text-slate-500">Courses with assignment content</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Active emails</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{activeCount}</p>
          <p className="mt-2 text-sm text-slate-500">Ready for new assignments</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiPower className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Needs setup</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{missingCount}</p>
          <p className="mt-2 text-sm text-slate-500">Missing or inactive templates</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Course Assignment Emails</h2>
            <p className="mt-1 text-sm text-slate-500">Each course needs one active email template. Place the Meet button wherever it should appear.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-500 shadow-sm">
              <FiSearch className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search course or template..."
                className="w-full min-w-52 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiPlus className="h-4 w-4" />
              New Template
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-4">Course</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    Loading email templates...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                    No courses match this view.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.course.id} className="align-middle">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                          <FiMail className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-bold text-slate-950">{row.course.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{row.course.programLevels?.length || 0} program levels</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <TemplateStatus template={row.template} />
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-sm truncate text-sm font-semibold text-slate-800">
                        {row.template?.subject || 'No subject yet'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(row.template?.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                        >
                          {row.template ? <FiEdit3 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
                          {row.template ? 'Edit' : 'Create'}
                        </button>
                        {row.template && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(row)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                            >
                              <FiPower className="h-4 w-4" />
                              {row.template.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100"
                            >
                              <FiTrash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
                <p className="mt-1 text-sm text-slate-500">Use placeholders to personalize the class assignment email.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close template modal"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid max-h-[calc(92vh-5rem)] overflow-y-auto lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Course</label>
                  <select
                    value={form.courseId}
                    onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}
                    disabled={Boolean(editingTemplate)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                    required
                  >
                    <option value="">Select course</option>
                    {items.map((item) => (
                      <option key={item.course.id} value={item.course.id}>
                        {item.course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Subject</label>
                  <input
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    placeholder="Prepare for {{courseName}}"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Body</label>
                  <textarea
                    value={form.body}
                    onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                    rows={13}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    placeholder="Write the assignment email..."
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Use {'{{meetButton}}'} wherever the blue Google Meet button should appear. Use {'{{#parent}}...{{/parent}}'} and {'{{#student}}...{{/student}}'} for recipient-specific sections.
                  </p>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Active for new assignments
                </label>

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Available placeholders</p>
                  <div className="flex flex-wrap gap-2">
                    {PREPARATION_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                      <button
                        key={placeholder}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, body: `${current.body}${current.body.endsWith(' ') || current.body.endsWith('\n') ? '' : ' '}${placeholder}` }))}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        {placeholder}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-700">Recipient blocks</p>
                  <div className="grid gap-2 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, body: `${current.body}\n\n{{#parent}}\nParent-only message here.\n{{/parent}}` }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      Add parent-only section
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, body: `${current.body}\n\n{{#student}}\nStudent-only message here.\n{{/student}}` }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      Add student-only section
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiCheckCircle className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <FiEye className="h-4 w-4 text-blue-600" />
                    Preview
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                    {(['parent', 'student'] as const).map((audience) => (
                      <button
                        key={audience}
                        type="button"
                        onClick={() => setPreviewAudience(audience)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                          previewAudience === audience ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {audience}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="rounded-2xl bg-[#06244a] p-4 text-white">
                    <p className="text-lg font-extrabold">9jacodekids Academy</p>
                    <p className="mt-1 text-sm text-blue-100">Class Management System</p>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-xl font-bold leading-tight text-slate-950">{previewSubject || 'Email subject preview'}</h3>
                    <div className="mt-4" dangerouslySetInnerHTML={{ __html: previewBody }} />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
