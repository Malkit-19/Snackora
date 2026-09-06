import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
    warning: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-semibold',
    danger: 'bg-red-100 text-red-900 border-red-300 font-semibold',
    b2b: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold',
    admin: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold'
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variants[variant] || variants.default} ${sizes[size]}`}
    >
      {children}
    </span>
  );
};

export default Badge;
