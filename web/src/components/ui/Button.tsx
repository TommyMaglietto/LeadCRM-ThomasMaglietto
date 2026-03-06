'use client';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-cream border border-ink',
    'hover:bg-accent-hover',
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
    'shadow-card-sm hover:shadow-card transition-shadow',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
  ].join(' '),

  secondary: [
    'bg-cream text-ink border border-ink',
    'hover:bg-cream-dark',
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
    'shadow-card-sm hover:shadow-card transition-shadow',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
  ].join(' '),

  ghost: [
    'bg-transparent text-stone border border-transparent',
    'hover:bg-ink/5 hover:text-ink',
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-red-50 text-red-700 border border-ink',
    'hover:bg-red-100',
    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
    'shadow-card-sm hover:shadow-card transition-shadow',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-[8px]',
  md: 'h-8 px-3 text-sm gap-2 rounded-[8px]',
  lg: 'h-10 px-4 text-sm gap-2 rounded-[8px]',
};

const spinnerSize: Record<ButtonSize, 'xs' | 'sm'> = {
  sm: 'xs',
  md: 'xs',
  lg: 'sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 outline-none select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading
        ? <Spinner size={spinnerSize[size]} className="shrink-0" />
        : leftIcon && <span className="shrink-0">{leftIcon}</span>
      }
      {children}
      {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
