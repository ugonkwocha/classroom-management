import { clsx } from '@/lib/utils';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'primary', children, className }: BadgeProps) {
  const variants = {
    primary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={clsx(
        'inline-block px-3 py-1 text-xs font-semibold rounded-full',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
