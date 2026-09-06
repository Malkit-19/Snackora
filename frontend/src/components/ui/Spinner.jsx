import React from 'react';

/**
 * Accessible SVG loading spinner
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {'primary'|'b2b'|'white'|'stone'} variant
 */
export const Spinner = ({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14'
  };

  const variants = {
    primary: 'text-amber-600',
    b2b: 'text-indigo-600',
    white: 'text-white',
    stone: 'text-stone-600'
  };

  return (
    <div
      role="status"
      className={`inline-flex items-center justify-center ${className}`}
      aria-live="polite"
    >
      <svg
        className={`animate-spin ${sizeClasses[size] || sizeClasses.md} ${variants[variant] || variants.primary}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default Spinner;
