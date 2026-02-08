'use client';

import { useEffect, useState } from 'react';
import { PRICE_OPTIONS, formatCurrency } from '@/lib/constants/pricing';
import { PriceType } from '@/types';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

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
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Pricing Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          ⚠️ Price changes apply to new enrollments only. Existing enrollments retain their original prices.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PRICE_OPTIONS.map((option) => {
          const state = pricing[option.type];

          if (!state) return null;

          return (
            <div
              key={option.type}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-600">{option.description}</p>
              </div>

              {state.isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount (Naira)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      value={state.amount}
                      onChange={(e) => handleAmountChange(option.type as PriceType, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-#db3236"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(option.type as PriceType)}
                      disabled={isSaving}
                      className="flex-1 px-3 py-2 bg-#db3236 text-white text-sm font-medium rounded-lg hover:bg-#c12b30 disabled:bg-gray-400"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleCancel(option.type as PriceType)}
                      disabled={isSaving}
                      className="flex-1 px-3 py-2 bg-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-#db3236">
                    {formatCurrency(state.amount)}
                  </p>
                  <button
                    onClick={() => handleEdit(option.type as PriceType)}
                    className="mt-3 w-full px-3 py-2 bg-red-100 text-#c12b30 text-sm font-medium rounded-lg hover:bg-red-200"
                  >
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
