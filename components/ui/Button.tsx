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
  const baseStyles = 'font-medium rounded-lg transition-colors duration-200 font-semibold';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#db3236] to-[#db3236] text-white hover:from-[#c12b30] hover:to-[#c12b30] active:scale-95',
    secondary: 'bg-[#f4c20d] text-gray-900 hover:bg-[#e6b008] active:scale-95',
    outline: 'border-2 border-[#db3236] text-[#db3236] hover:bg-red-50 active:scale-95',
    danger: 'bg-[#db3236] text-white hover:bg-[#c12b30] active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
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
