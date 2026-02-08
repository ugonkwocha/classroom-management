'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import { ProgramEnrollment, Student, Program, PriceType } from '@/types';
import { PRICE_OPTIONS, formatCurrency, getPriceLabel } from '@/lib/constants/pricing';

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
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>(
    enrollment?.priceType || 'FULL_PRICE'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student || !enrollment || !program) {
    return null;
  }

  const currentPriceLabel = getPriceLabel(enrollment.priceType || 'FULL_PRICE');
  const currentAmount = enrollment.priceAmount || 60000;
  const newPriceOption = PRICE_OPTIONS.find((opt) => opt.type === selectedPriceType);
  const newAmount = newPriceOption?.amount || 60000;

  const handleSave = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await onSave(enrollment.id, selectedPriceType, newAmount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedPriceType(enrollment?.priceType || 'FULL_PRICE');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Enrollment Price">
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
                <p className="text-lg font-bold text-#db3236">{formatCurrency(currentAmount)}</p>
              </div>
            </div>
            {newAmount !== currentAmount && (
              <div>
                <p className="text-xs text-gray-600">New Price</p>
                <div>
                  <p className="text-xs text-gray-700">{getPriceLabel(selectedPriceType)}</p>
                  <p className="text-lg font-bold text-#4885ed">{formatCurrency(newAmount)}</p>
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
            Select New Pricing Option
          </label>
          <div className="space-y-2">
            {PRICE_OPTIONS.map((option) => (
              <label
                key={option.type}
                className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-red-50"
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
                  onChange={(e) => setSelectedPriceType(e.target.value as PriceType)}
                  className="w-4 h-4 text-#db3236 rounded focus:ring-2 focus:ring-#db3236 mt-0.5"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                    <span className="text-lg font-bold text-#db3236">
                      {formatCurrency(option.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={isLoading || selectedPriceType === enrollment.priceType}
            className="flex-1 px-4 py-2 bg-#db3236 text-white font-medium rounded-lg hover:bg-#c12b30 disabled:bg-gray-400 text-sm"
          >
            {isLoading ? 'Updating...' : 'Update Price'}
          </button>
          <button
            onClick={() => handleOpenChange(false)}
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
