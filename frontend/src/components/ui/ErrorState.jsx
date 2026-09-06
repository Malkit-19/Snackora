import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Reusable ErrorState component for network, API, or permission errors
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data. Please try again.',
  onRetry,
  retryText = 'Try Again',
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div
      role="alert"
      className={`
        flex flex-col items-center justify-center p-8 sm:p-12 text-center
        bg-white rounded-3xl border border-rose-200 shadow-sm max-w-lg mx-auto my-6
        ${className}
      `}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
        <AlertTriangle className="w-8 h-8" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-black text-stone-900 tracking-tight mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">{message}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="danger" size="sm" leftIcon={RefreshCw}>
            {retryText}
          </Button>
        )}
        {secondaryActionText && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="secondary" size="sm">
            {secondaryActionText}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
