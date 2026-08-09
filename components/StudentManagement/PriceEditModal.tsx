'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { ProgramEnrollment, Student, Program, PriceType } from '@/types';
import { formatCurrency, getPriceLabel } from '@/lib/constants/pricing';
import { usePricing } from '@/lib/hooks';

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  enrollment: ProgramEnrollment | null;
  program: Program | null;
  onSave: (enrollmentId: string, priceType: PriceType, priceAmount: number) => Promise<void>;
}

export function PriceEditModal({
  isOpen,
  onClose,
  student,
  enrollment,
  program,
  onSave,
}: PriceEditModalProps) {
  const { priceOptions, getPriceOption } = usePricing();
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>(
    enrollment?.priceType || 'FULL_PRICE'
  );
  const [selectedAmount, setSelectedAmount] = useState(enrollment?.priceAmount || 60000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !enrollment) return;

    setSelectedPriceType(enrollment.priceType || 'FULL_PRICE');
    setSelectedAmount(enrollment.priceAmount || 60000);
    setError(null);
  }, [isOpen, enrollment]);

  if (!isOpen || !student || !enrollment || !program) {
    return null;
  }

  const currentPriceLabel = getPriceOption(enrollment.priceType || 'FULL_PRICE')?.label || getPriceLabel(enrollment.priceType || 'FULL_PRICE');
  const currentAmount = enrollment.priceAmount || 60000;
  const newAmount = selectedAmount;
  const hasChanges =
    selectedPriceType !== enrollment.priceType || newAmount !== currentAmount;

  const handleSave = async () => {
    try {
      setError(null);
      if (!Number.isFinite(newAmount) || newAmount <= 0) {
        setError('Confirmed amount must be greater than zero.');
        return;
      }
      setIsLoading(true);
      await onSave(enrollment.id, selectedPriceType, newAmount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Payment Details">
      <div className="space-y-4">
        {/* Student and Program Info */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
          <div>
            <p className="text-xs text-gray-600">Student</p>
            <p className="text-sm font-semibold text-gray-900">
              {student.firstName} {student.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Program</p>
            <p className="text-sm font-semibold text-gray-900">
              {program.name} - {program.season} {program.year}
            </p>
          </div>
          <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Current Price</p>
              <div>
                <p className="text-xs text-gray-700">{currentPriceLabel}</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(currentAmount)}</p>
              </div>
            </div>
            {hasChanges && (
              <div>
                <p className="text-xs text-gray-600">New Price</p>
                <div>
                  <p className="text-xs text-gray-700">{getPriceOption(selectedPriceType)?.label || getPriceLabel(selectedPriceType)}</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(newAmount)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Price Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Pricing Option
          </label>
          <div className="space-y-2">
            {priceOptions.map((option) => (
              <label
                key={option.type}
                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-purple-50"
                style={{
                  borderColor: selectedPriceType === option.type ? '#9333ea' : '#d1d5db',
                  backgroundColor: selectedPriceType === option.type ? '#f3e8ff' : '#ffffff',
                }}
              >
                <input
                  type="radio"
                  name="priceType"
                  value={option.type}
                  checked={selectedPriceType === option.type}
                  onChange={(e) => {
                    const nextType = e.target.value as PriceType;
                    const option = priceOptions.find((item) => item.type === nextType);
                    setSelectedPriceType(nextType);
                    if (option) setSelectedAmount(option.amount);
                  }}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                    <span className="text-lg font-bold text-purple-600">
                      {formatCurrency(option.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="confirmedAmount" className="block text-sm font-semibold text-gray-700 mb-2">
            Confirmed Amount
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₦</span>
            <input
              id="confirmedAmount"
              type="number"
              min="1"
              step="1"
              value={selectedAmount}
              onChange={(event) => setSelectedAmount(Number(event.target.value))}
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-8 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            Enter the exact bank-transfer amount confirmed for this enrollment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isLoading || !hasChanges || !Number.isFinite(newAmount) || newAmount <= 0}
            className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm"
          >
            {isLoading ? 'Updating...' : 'Update payment details'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 disabled:bg-gray-400 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
