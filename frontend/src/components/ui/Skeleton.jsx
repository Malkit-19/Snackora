import React from 'react';

/**
 * Pulse Skeleton component for loading placeholders
 */
export const Skeleton = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-stone-200/80 rounded-xl';

  if (variant === 'circular') {
    return (
      <div
        className={`rounded-full ${baseClasses} ${className}`}
        style={{ width: width || height || '40px', height: height || width || '40px' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'text') {
    if (lines > 1) {
      return (
        <div className="space-y-2 w-full" aria-hidden="true">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 ${baseClasses} ${i === lines - 1 ? 'w-3/4' : 'w-full'} ${className}`}
            />
          ))}
        </div>
      );
    }
    return (
      <div
        className={`h-4 w-full ${baseClasses} ${className}`}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className="bg-white rounded-3xl border border-stone-200 p-5 space-y-4 w-full"
        aria-hidden="true"
      >
        <div className="w-full aspect-square bg-stone-200/80 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="w-2/3 h-4 bg-stone-200/80 rounded-lg animate-pulse" />
          <div className="w-full h-3 bg-stone-100 rounded-lg animate-pulse" />
          <div className="w-1/2 h-3 bg-stone-100 rounded-lg animate-pulse" />
        </div>
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div className="w-1/3 h-6 bg-stone-200/80 rounded-lg animate-pulse" />
          <div className="w-20 h-8 bg-stone-200/80 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Rectangular default
  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
