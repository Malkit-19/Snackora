import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  icon: Icon,
  className = ''
}) => {
  const variants = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    primary: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    secondary: 'bg-stone-200/70 text-stone-800 border-stone-300 font-medium',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
    warning: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    danger: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold',
    b2b: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold',
    admin: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
    outline: 'bg-transparent text-stone-700 border-stone-300'
  };

  const dotColors = {
    default: 'bg-stone-500',
    primary: 'bg-amber-600',
    secondary: 'bg-stone-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    b2b: 'bg-indigo-600',
    admin: 'bg-purple-600',
    outline: 'bg-stone-400'
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  const vClass = variants[variant] || variants.default;
  const sClass = sizes[size] || sizes.sm;

  return (
    <span className={`inline-flex items-center rounded-full border leading-none select-none ${vClass} ${sClass} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-stone-500'} shrink-0`} aria-hidden="true" />
      )}
      {Icon && <Icon className={`${iconSizes[size] || 'w-3 h-3'} shrink-0`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
