'use client';

import { PricingManagement } from '../Dashboard/PricingManagement';
import { FiDollarSign, FiTag, FiTrendingUp } from 'react-icons/fi';

export function PricingPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiDollarSign className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Pricing Tiers</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">3</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <FiTag className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Discount Rules</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">2</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600">
            <FiTrendingUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-500">Applies To</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">New</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PricingManagement />
      </section>
    </div>
  );
}
