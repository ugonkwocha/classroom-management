'use client';

import { ProgramEnrollment, Program } from '@/types';
import { Select, Button } from '@/components/ui';
import { useState } from 'react';

interface PaymentStatusSectionProps {
  enrollments: ProgramEnrollment[];
  programs: Program[];
  onUpdatePaymentStatus: (enrollmentId: string, paymentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED') => void;
}

export function PaymentStatusSection({
  enrollments,
  programs,
  onUpdatePaymentStatus,
}: PaymentStatusSectionProps) {
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<'PENDING' | 'CONFIRMED' | 'COMPLETED'>('PENDING');

  const startEdit = (enrollmentId: string, currentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | undefined) => {
    setEditingEnrollmentId(enrollmentId);
    setEditingPaymentStatus(currentStatus || 'PENDING');
  };

  const saveEdit = () => {
    if (editingEnrollmentId) {
      onUpdatePaymentStatus(editingEnrollmentId, editingPaymentStatus);
      setEditingEnrollmentId(null);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'text-gray-600';
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'CONFIRMED':
        return 'text-blue-600';
      case 'PENDING':
      default:
        return 'text-amber-600';
    }
  };

  const getStatusBg = (status: string | undefined) => {
    if (!status) return 'bg-gray-50';
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50';
      case 'CONFIRMED':
        return 'bg-blue-50';
      case 'PENDING':
      default:
        return 'bg-amber-50';
    }
  };

  if (enrollments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Program Payment Status</h3>
      <div className="space-y-3">
        {enrollments.map((enrollment) => {
          const program = programs.find((p) => p.id === enrollment.programId);
          const isEditing = editingEnrollmentId === enrollment.id;

          return (
            <div
              key={enrollment.id}
              className={`p-4 rounded-lg border border-gray-200 ${getStatusBg(enrollment.paymentStatus)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{program?.name}</p>
                  <p className="text-xs text-gray-600">
                    {program?.season} {program?.year}
                  </p>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingEnrollmentId(null)}
                      className="text-xs py-1 px-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={saveEdit}
                      className="text-xs py-1 px-2"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => startEdit(enrollment.id, enrollment.paymentStatus)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <Select
                  label="Payment Status"
                  value={editingPaymentStatus}
                  onChange={(e) => setEditingPaymentStatus(e.target.value as 'pending' | 'confirmed' | 'completed')}
                  options={[
                    { value: 'pending', label: 'Pending - Awaiting Payment' },
                    { value: 'confirmed', label: 'Confirmed - Payment Verified' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                  className="mt-2"
                />
              ) : (
                <div>
                  <p className={`text-sm font-semibold ${getStatusColor(enrollment.paymentStatus)}`}>
                    {enrollment.paymentStatus
                      ? enrollment.paymentStatus.charAt(0).toUpperCase() + enrollment.paymentStatus.slice(1)
                      : 'Not Set'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
