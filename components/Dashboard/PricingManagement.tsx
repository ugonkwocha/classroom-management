'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/constants/pricing';
import { PriceOption } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { FiCheckCircle, FiEdit3, FiPlus, FiTag, FiX } from 'react-icons/fi';

type EditState = {
  type: string;
  label: string;
  description: string;
  amount: number;
};

const emptyCreateForm = { label: '', description: '', amount: 0 };

export function PricingManagement({ onOptionsChanged }: { onOptionsChanged?: (options: PriceOption[]) => void }) {
  const [options, setOptions] = useState<PriceOption[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadOptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/pricing?includeInactive=true');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch pricing');

      const nextOptions: PriceOption[] = data.map((config: {
        priceType: string;
        label: string;
        description: string;
        amount: number;
        isActive: boolean;
        isSystem: boolean;
        displayOrder: number;
      }) => ({
        type: config.priceType,
        label: config.label,
        description: config.description,
        amount: config.amount,
        isActive: config.isActive,
        isSystem: config.isSystem,
        displayOrder: config.displayOrder,
      }));
      setOptions(nextOptions);
      onOptionsChanged?.(nextOptions.filter((option) => option.isActive !== false));
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load pricing configuration' });
    } finally {
      setIsLoading(false);
    }
  }, [onOptionsChanged]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const validate = (label: string, description: string, amount: number) => {
    if (label.trim().length < 2) return 'Enter a pricing option name.';
    if (description.trim().length < 2) return 'Enter a short description.';
    if (!Number.isInteger(amount) || amount <= 0 || amount > 10000000) {
      return 'Price must be a whole number between 1 and 10,000,000 Naira.';
    }
    return null;
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate(createForm.label, createForm.description, createForm.amount);
    if (validationError) return setMessage({ type: 'error', text: validationError });

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetchWithAuth('/api/pricing', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create pricing option');

      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      setMessage({ type: 'success', text: `${data.label} created and is ready for new enrollments.` });
      await loadOptions();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create pricing option' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    const validationError = validate(editing.label, editing.description, editing.amount);
    if (validationError) return setMessage({ type: 'error', text: validationError });

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetchWithAuth('/api/pricing', {
        method: 'PUT',
        body: JSON.stringify({
          priceType: editing.type,
          label: editing.label,
          description: editing.description,
          amount: editing.amount,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update pricing option');

      setEditing(null);
      setMessage({ type: 'success', text: `${data.label} updated successfully.` });
      await loadOptions();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update pricing option' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && options.length === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="text-center text-sm text-slate-600">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
            <FiTag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">Pricing Options</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-blue-800">
              Options apply to new enrollments. Existing enrollment labels and confirmed amounts are preserved.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(true); setEditing(null); setMessage(null); }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <FiPlus className="h-4 w-4" />
          Add pricing option
        </button>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm font-bold ${message.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
          {message.text}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-950">New pricing option</h4>
              <p className="mt-1 text-sm text-slate-500">It will appear immediately in paid registration and enrollment forms.</p>
            </div>
            <button type="button" onClick={() => setShowCreate(false)} aria-label="Close new pricing option form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Option name</span>
              <input required maxLength={60} value={createForm.label} onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Scholarship Rate" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Description</span>
              <input required maxLength={180} value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Who this option is for" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Default amount (Naira)</span>
              <input required type="number" min={1} max={10000000} step={1} value={createForm.amount || ''} onChange={(event) => setCreateForm((current) => ({ ...current, amount: Number(event.target.value) }))} placeholder="50000" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              <FiCheckCircle className="h-4 w-4" />
              {isSaving ? 'Creating...' : 'Create option'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {options.map((option) => {
          const isEditing = editing?.type === option.type;
          return (
            <div key={option.type} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {isEditing && editing ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500">Option name
                    <input value={editing.label} onChange={(event) => setEditing({ ...editing, label: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Description
                    <input value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block text-xs font-bold uppercase text-slate-500">Default amount (Naira)
                    <input type="number" min={1} max={10000000} step={1} value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"><FiCheckCircle /> Save</button>
                    <button type="button" onClick={() => setEditing(null)} disabled={isSaving} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-950">{option.label}</p>
                        {!option.isSystem && <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">Custom</span>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FiTag className="h-5 w-5" /></div>
                  </div>
                  <p className="mt-5 text-3xl font-bold text-slate-950">{formatCurrency(option.amount)}</p>
                  <button type="button" onClick={() => { setEditing({ type: option.type, label: option.label, description: option.description, amount: option.amount }); setShowCreate(false); setMessage(null); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
                    <FiEdit3 className="h-4 w-4" /> Edit option
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
