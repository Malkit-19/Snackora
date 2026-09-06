import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable accessible Input component
 */
export const Input = forwardRef(({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  helperText,
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  autoComplete,
  ...rest
}, ref) => {
  const inputId = id || (name ? `input-${name}` : undefined);
  const helperId = helperText && inputId ? `${inputId}-helper` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider text-stone-700 select-none"
          >
            {label}
            {required && <span className="text-amber-600 ml-0.5" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <LeftIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          aria-required={required}
          className={`
            w-full bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm rounded-xl
            border transition-all duration-150 py-2.5
            ${LeftIcon ? 'pl-10' : 'pl-4'}
            ${RightIcon || error ? 'pr-10' : 'pr-4'}
            ${error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
              : 'border-stone-200 hover:border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/60 focus:bg-white'
            }
            disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
            focus:outline-none
            ${className}
          `}
          {...rest}
        />

        {error ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-rose-500">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
          </div>
        ) : RightIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
            <RightIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1" role="alert">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-stone-500 mt-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
