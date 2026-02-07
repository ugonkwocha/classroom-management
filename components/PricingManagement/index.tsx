'use client';

import { PricingManagement } from '../Dashboard/PricingManagement';
import { Card } from '@/components/ui';

export function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pricing Management</h1>
        <p className="text-gray-600">Configure pricing tiers for student enrollments. Changes apply to new enrollments only.</p>
      </div>

      <Card>
        <PricingManagement />
      </Card>
    </div>
  );
}
