import React, { forwardRef } from 'react';

/**
 * Reusable accessible Button component
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'b2b'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export const Button = forwardRef(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  ...rest
}, ref) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow ' +
      'focus-visible:ring-amber-500 border border-amber-700/20 active:bg-amber-800',
    secondary:
      'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300/80 ' +
      'focus-visible:ring-stone-400 active:bg-stone-300',
    outline:
      'bg-transparent border-2 border-amber-600 text-amber-800 hover:bg-amber-50 ' +
      'focus-visible:ring-amber-500 active:bg-amber-100/70',
    ghost:
      'bg-transparent hover:bg-stone-100 text-stone-700 hover:text-stone-900 ' +
      'focus-visible:ring-stone-400 active:bg-stone-200/60',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ' +
      'focus-visible:ring-rose-500 border border-rose-700/20 active:bg-rose-800',
    b2b:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow ' +
      'focus-visible:ring-indigo-500 border border-indigo-700/20 active:bg-indigo-800'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[40px]',
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[48px]'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <svg
          className={`animate-spin ${iconSizes[size]} text-current shrink-0`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {!loading && LeftIcon && (
        <LeftIcon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
      )}

      <span className="truncate">{children}</span>

      {!loading && RightIcon && (
        <RightIcon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
