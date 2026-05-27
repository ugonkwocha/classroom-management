import { clsx } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]',
    secondary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.99]',
    outline:
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.99]',
    danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-[0.99]',
  };

  const sizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
