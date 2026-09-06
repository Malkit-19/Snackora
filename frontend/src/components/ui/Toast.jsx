import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Reusable accessible Toast alert component
 * @param {'success'|'error'|'warning'|'info'} variant
 */
export const Toast = ({
  id,
  variant = 'info',
  title,
  message,
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const variants = {
    success: {
      container: 'bg-emerald-950 text-white border-emerald-700/80 shadow-emerald-950/20',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400'
    },
    error: {
      container: 'bg-rose-950 text-white border-rose-700/80 shadow-rose-950/20',
      icon: AlertCircle,
      iconColor: 'text-rose-400'
    },
    warning: {
      container: 'bg-amber-950 text-white border-amber-700/80 shadow-amber-950/20',
      icon: AlertTriangle,
      iconColor: 'text-amber-400'
    },
    info: {
      container: 'bg-stone-900 text-white border-stone-700 shadow-stone-950/20',
      icon: Info,
      iconColor: 'text-sky-400'
    }
  };

  const currentVariant = variants[variant] || variants.info;
  const Icon = currentVariant.icon;

  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`
        flex items-start gap-3 p-4 rounded-2xl border shadow-xl
        max-w-md w-full transition-all duration-200 animate-in slide-in-from-bottom-3
        ${currentVariant.container}
      `}
    >
      <Icon className={`w-5 h-5 ${currentVariant.iconColor} shrink-0 mt-0.5`} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-bold tracking-tight mb-0.5">{title}</h4>}
        <p className="text-xs leading-relaxed text-stone-200">{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={() => onClose(id)}
          aria-label="Close notification"
          className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default Toast;
