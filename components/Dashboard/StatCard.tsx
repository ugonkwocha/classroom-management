'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, subtext, variant = 'primary' }: StatCardProps) {
  const variants = {
    primary: 'from-purple-500 to-purple-600',
    success: 'from-green-500 to-green-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br ${variants[variant]} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}
    >
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
      {subtext && <p className="text-sm opacity-75 mt-2">{subtext}</p>}
    </motion.div>
  );
}
