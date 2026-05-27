'use client';

import { useEffect, useState } from 'react';
import { PRICE_OPTIONS, formatCurrency } from '@/lib/constants/pricing';
import { PriceType } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { FiCheckCircle, FiEdit3, FiTag } from 'react-icons/fi';

interface PricingEditState {
  [key: string]: {
    amount: number;
    originalAmount: number;
    isEditing: boolean;
  };
}

export function PricingManagement() {
  const [pricing, setPricing] = useState<PricingEditState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current pricing from API
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetchWithAuth('/api/pricing');
        if (!response.ok) throw new Error('Failed to fetch pricing');

        const data = await response.json();

        // Initialize state from fetched data
        const initialState: PricingEditState = {};
        PRICE_OPTIONS.forEach((option) => {
          const config = data.find((p: any) => p.priceType === option.type);
          const amount = config?.amount || option.amount;
          initialState[option.type] = {
            amount,
            originalAmount: amount,
            isEditing: false,
          };
        });

        setPricing(initialState);
      } catch (error) {
        console.error('Error fetching pricing:', error);
        setMessage({ type: 'error', text: 'Failed to load pricing configuration' });

        // Initialize with defaults if fetch fails
        const initialState: PricingEditState = {};
        PRICE_OPTIONS.forEach((option) => {
          initialState[option.type] = {
            amount: option.amount,
            originalAmount: option.amount,
            isEditing: false,
          };
        });
        setPricing(initialState);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const handleEdit = (priceType: PriceType) => {
    setPricing((prev) => ({
      ...prev,
      [priceType]: {
        ...prev[priceType],
        isEditing: true,
      },
    }));
  };

  const handleCancel = (priceType: PriceType) => {
    setPricing((prev) => ({
      ...prev,
      [priceType]: {
        ...prev[priceType],
        amount: prev[priceType].originalAmount,
        isEditing: false,
      },
    }));
  };

  const handleAmountChange = (priceType: PriceType, value: string) => {
    const amount = parseInt(value, 10) || 0;
    setPricing((prev) => ({
      ...prev,
      [priceType]: {
        ...prev[priceType],
        amount,
      },
    }));
  };

  const validatePrice = (amount: number): boolean => {
    return amount > 0 && amount <= 1000000; // Max 1 million Naira
  };

  const handleSave = async (priceType: PriceType) => {
    const state = pricing[priceType];

    if (!validatePrice(state.amount)) {
      setMessage({
        type: 'error',
        text: 'Price must be between 1 and 1,000,000 Naira',
      });
      return;
    }

    if (state.amount === state.originalAmount) {
      setPricing((prev) => ({
        ...prev,
        [priceType]: {
          ...prev[priceType],
          isEditing: false,
        },
      }));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetchWithAuth('/api/pricing', {
        method: 'PUT',
        body: JSON.stringify({
          priceType,
          amount: state.amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update pricing');
      }

      // Update successful
      setPricing((prev) => ({
        ...prev,
        [priceType]: {
          ...prev[priceType],
          originalAmount: state.amount,
          isEditing: false,
        },
      }));

      setMessage({
        type: 'success',
        text: `${PRICE_OPTIONS.find((p) => p.type === priceType)?.label} updated successfully`,
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating pricing:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update pricing',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="text-center text-sm text-slate-600">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
            <FiTag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">Pricing Configuration</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-blue-800">
              Price changes apply to new enrollments only. Existing enrollments retain their original prices.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-3 text-sm font-bold ${
            message.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PRICE_OPTIONS.map((option) => {
          const state = pricing[option.type];

          if (!state) return null;

          return (
            <div
              key={option.type}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-950">{option.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiTag className="h-5 w-5" />
                </div>
              </div>

              {state.isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Amount (Naira)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      value={state.amount}
                      onChange={(e) => handleAmountChange(option.type as PriceType, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(option.type as PriceType)}
                      disabled={isSaving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiCheckCircle className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleCancel(option.type as PriceType)}
                      disabled={isSaving}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-slate-950">
                    {formatCurrency(state.amount)}
                  </p>
                  <button
                    onClick={() => handleEdit(option.type as PriceType)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    <FiEdit3 className="h-4 w-4" />
                    Edit Price
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
