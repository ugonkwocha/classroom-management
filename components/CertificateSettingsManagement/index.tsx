'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FiAward, FiEdit3, FiSave, FiSettings } from 'react-icons/fi';
import { Button, Modal } from '@/components/ui';
import { useCourses } from '@/lib/hooks';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { PERMISSIONS } from '@/lib/permissions';
import type { Course } from '@/types';

type Settings = { signatoryName: string; signatoryTitle: string; signaturePath?: string | null; emailSubject: string; emailMessage: string; isActive: boolean };
type Template = { certificateTitle: string; achievementWording: string; isActive: boolean };

export function CertificateSettingsManagement() {
  const { courses } = useCourses();
  const { hasPermission } = useAuth();
  const canManageGlobal = hasPermission(PERMISSIONS.MANAGE_CERTIFICATE_SETTINGS);
  const canManageTemplates = hasPermission(PERMISSIONS.MANAGE_COURSE_CERTIFICATE_TEMPLATES);
  const [settings, setSettings] = useState<Settings>({ signatoryName: '', signatoryTitle: '', emailSubject: 'Your 9jacodekids certificate - {{courseName}}', emailMessage: 'Congratulations {{studentName}} on completing {{courseName}}. Your certificate is attached.', isActive: false });
  const [signature, setSignature] = useState<File | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [template, setTemplate] = useState<Template>({ certificateTitle: '', achievementWording: '', isActive: false });
  const [templateState, setTemplateState] = useState<Record<string, Template>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/certificate-settings').then(async (response) => {
      if (response.ok) setSettings(await response.json());
    });
  }, []);

  useEffect(() => {
    if (!courses.length) return;
    Promise.all(courses.map(async (course) => {
      const response = await fetchWithAuth(`/api/courses/${course.id}/certificate-template`);
      return [course.id, response.ok ? await response.json() : null] as const;
    })).then((entries) => setTemplateState(Object.fromEntries(entries.filter((entry) => entry[1]))));
  }, [courses]);

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage(null);
    const formData = new FormData();
    Object.entries(settings).forEach(([key, value]) => formData.set(key, String(value ?? '')));
    if (signature) formData.set('signature', signature);
    const response = await fetchWithAuth('/api/certificate-settings', { method: 'PUT', body: formData });
    const payload = await response.json();
    setMessage({ type: response.ok ? 'success' : 'error', text: response.ok ? 'Certificate settings saved.' : payload.error || 'Failed to save settings.' });
    if (response.ok) { setSettings(payload); setSignature(null); }
    setSaving(false);
  };

  const openTemplate = (course: Course) => {
    setEditingCourse(course);
    setTemplate(templateState[course.id] || { certificateTitle: course.name, achievementWording: 'and demonstrating an understanding of the core concepts and skills covered in this course.', isActive: false });
  };

  const saveTemplate = async () => {
    if (!editingCourse) return;
    setSaving(true);
    const response = await fetchWithAuth(`/api/courses/${editingCourse.id}/certificate-template`, { method: 'PUT', body: JSON.stringify(template) });
    const payload = await response.json();
    if (response.ok) { setTemplateState((current) => ({ ...current, [editingCourse.id]: payload })); setEditingCourse(null); setMessage({ type: 'success', text: `${editingCourse.name} certificate wording saved.` }); }
    else setMessage({ type: 'error', text: payload.error || 'Failed to save course certificate wording.' });
    setSaving(false);
  };

  return <div className="space-y-6">
    {message && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>{message.text}</div>}
    {canManageGlobal && <form onSubmit={saveSettings} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><FiSettings /></span><div><h2 className="font-bold text-slate-950">Academy certificate settings</h2><p className="text-sm text-slate-500">Configure the signer, signature, and delivery message.</p></div></div>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Signatory name<input value={settings.signatoryName} onChange={(event) => setSettings({ ...settings, signatoryName: event.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
        <label className="text-sm font-semibold text-slate-700">Signatory title<input value={settings.signatoryTitle} onChange={(event) => setSettings({ ...settings, signatoryTitle: event.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
        <label className="text-sm font-semibold text-slate-700">Signature image<input type="file" accept="image/png,image/jpeg" onChange={(event) => setSignature(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3" /><span className="mt-1 block text-xs font-normal text-slate-500">PNG or JPG. {settings.signaturePath ? 'A signature is currently stored. Uploading replaces it.' : 'Required before activation.'}</span></label>
        <label className="text-sm font-semibold text-slate-700">Email subject<input value={settings.emailSubject} onChange={(event) => setSettings({ ...settings, emailSubject: event.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
        <label className="text-sm font-semibold text-slate-700 lg:col-span-2">Certificate email message<textarea value={settings.emailMessage} onChange={(event) => setSettings({ ...settings, emailMessage: event.target.value })} required rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /><span className="mt-1 block text-xs font-normal text-slate-500">Placeholders: {'{{studentName}}'}, {'{{courseName}}'}, {'{{certificateNumber}}'}, {'{{verificationUrl}}'}</span></label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold"><input type="checkbox" checked={settings.isActive} onChange={(event) => setSettings({ ...settings, isActive: event.target.checked })} /> Enable certificate issuance</label>
      </div><div className="flex justify-end border-t border-slate-100 p-5"><Button type="submit" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save settings'}</Button></div>
    </form>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-amber-50 p-3 text-amber-600"><FiAward /></span><div><h2 className="font-bold">Course certificate wording</h2><p className="text-sm text-slate-500">Every course starts inactive until an admin reviews its title and achievement wording.</p></div></div><div className="divide-y divide-slate-100">{courses.map((course) => { const item = templateState[course.id]; return <div key={course.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{course.name}</p><p className="mt-1 text-sm text-slate-500">{item?.certificateTitle || 'Draft not reviewed'}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item?.isActive ? 'Active' : 'Inactive draft'}</span>{canManageTemplates && <Button size="sm" variant="outline" onClick={() => openTemplate(course)}><FiEdit3 /> Edit</Button>}</div></div>; })}</div></section>

    <Modal isOpen={Boolean(editingCourse)} onClose={() => setEditingCourse(null)} title={editingCourse ? `${editingCourse.name} certificate` : 'Course certificate'} size="lg"><div className="space-y-5"><label className="block text-sm font-semibold text-slate-700">Certificate course title<input value={template.certificateTitle} onChange={(event) => setTemplate({ ...template, certificateTitle: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label><label className="block text-sm font-semibold text-slate-700">Achievement wording<textarea value={template.achievementWording} onChange={(event) => setTemplate({ ...template, achievementWording: event.target.value })} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /><span className="mt-1 block text-xs font-normal text-slate-500">This appears beneath the course title on every certificate for this course.</span></label><label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold"><input type="checkbox" checked={template.isActive} onChange={(event) => setTemplate({ ...template, isActive: event.target.checked })} /> Active for certificate issuance</label><div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase text-blue-600">Preview wording</p><p className="mt-2 text-center text-lg font-bold">{template.certificateTitle || 'Course title'}</p><p className="mt-2 text-center text-sm text-slate-600">{template.achievementWording || 'Achievement wording'}</p></div><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setEditingCourse(null)}>Cancel</Button><Button onClick={saveTemplate} disabled={saving}><FiSave /> Save wording</Button></div></div></Modal>
  </div>;
}
