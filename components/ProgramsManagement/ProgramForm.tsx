'use client';

import { useState } from 'react';
import { Program, ProgramType, Season } from '@/types';
import { Input, Select, Button } from '@/components/ui';

interface ProgramFormProps {
  onSubmit: (program: Omit<Program, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: Program;
  isLoading?: boolean;
}

const programTypeOptions = [
  { value: 'WEEKEND_CLUB', label: 'Weekend Club' },
  { value: 'HOLIDAY_CAMP', label: 'Holiday Camp' },
];

const seasonOptions = [
  { value: 'JANUARY', label: 'January (2nd Term)' },
  { value: 'EASTER', label: 'Easter Holiday' },
  { value: 'MAY', label: 'May (3rd Term)' },
  { value: 'SUMMER', label: 'Summer Holiday' },
  { value: 'OCTOBER', label: 'October (1st Term)' },
];

export function ProgramForm({ onSubmit, onCancel, initialData, isLoading = false }: ProgramFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: (initialData?.type || '') as ProgramType,
    season: (initialData?.season || '') as Season,
    year: initialData?.year || 2025,
    batches: initialData?.batches || 1,
    slots: initialData?.slots || [],
    startDate: initialData?.startDate || '',
  });

  const [newSlot, setNewSlot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Program name is required';
    if (!formData.type) newErrors.type = 'Program type is required';
    if (!formData.season) newErrors.season = 'Season is required';
    if (formData.year < 2024) newErrors.year = 'Year must be 2024 or later';
    if (formData.year > 2100) newErrors.year = 'Year must be 2100 or earlier';
    if (!formData.startDate) newErrors.startDate = 'Program start date is required';
    if (formData.batches < 1) newErrors.batches = 'Batches must be at least 1';
    if (formData.batches > 10) newErrors.batches = 'Batches cannot exceed 10';
    if (formData.slots.length === 0) newErrors.slots = 'At least one slot is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: formData.name,
      type: formData.type,
      season: formData.season,
      year: formData.year,
      batches: Math.floor(formData.batches),
      slots: formData.slots,
      startDate: formData.startDate,
    });

    setFormData({
      name: '',
      type: '' as ProgramType,
      season: '' as Season,
      year: 2025,
      batches: 1,
      slots: [],
      startDate: '',
    });
    setNewSlot('');
    setErrors({});
  };

  const addSlot = () => {
    if (newSlot.trim()) {
      setFormData({
        ...formData,
        slots: [...formData.slots, newSlot.trim()],
      });
      setNewSlot('');
    }
  };

  const removeSlot = (index: number) => {
    setFormData({
      ...formData,
      slots: formData.slots.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Program Name"
        type="text"
        placeholder="e.g., Easter Holiday Code Camp"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Select
        label="Program Type"
        options={programTypeOptions}
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as ProgramType })}
        error={errors.type}
      />

      <Select
        label="Season"
        options={seasonOptions}
        value={formData.season}
        onChange={(e) => setFormData({ ...formData, season: e.target.value as Season })}
        error={errors.season}
      />

      <Input
        label="Year"
        type="number"
        min="2024"
        max="2100"
        value={formData.year}
        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2025 })}
        error={errors.year}
      />

      <Input
        label="Program Start Date"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        error={errors.startDate}
      />

      <Input
        label="Number of Batches"
        type="number"
        min="1"
        max="10"
        value={formData.batches}
        onChange={(e) => setFormData({ ...formData, batches: parseInt(e.target.value) || 1 })}
        error={errors.batches}
      />

      <div className="border-t border-slate-100 pt-4">
        <label className="mb-3 block text-sm font-bold text-slate-700">Time Slots</label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Morning 9am-11am"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSlot();
                }
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
              Add Slot
            </Button>
          </div>

          {formData.slots.length > 0 && (
            <div className="space-y-2">
              {formData.slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="text-sm font-medium text-slate-700">{slot}</span>
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {errors.slots && <p className="text-sm font-medium text-rose-600">{errors.slots}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" className="flex-1" disabled={isLoading}>
          {initialData ? 'Update Program' : 'Create Program'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
