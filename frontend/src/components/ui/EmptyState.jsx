import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

/**
 * Empty state display component for products, cart, and search results
 */
export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet.',
  description = 'Check back soon for fresh snacks and updates.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center p-8 sm:p-12 text-center
        bg-white rounded-3xl border border-stone-200/90 shadow-sm max-w-lg mx-auto my-6
        ${className}
      `}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 border border-amber-100 shadow-inner">
        <Icon className="w-8 h-8" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-black text-stone-900 tracking-tight mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <Button onClick={onAction} size="sm">
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="secondary" size="sm">
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
