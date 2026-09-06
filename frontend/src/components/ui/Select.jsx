import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Reusable accessible Select dropdown component
 */
export const Select = forwardRef(({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder,
  helperText,
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  className = '',
  children,
  ...rest
}, ref) => {
  const selectId = id || (name ? `select-${name}` : undefined);
  const helperId = helperText && selectId ? `${selectId}-helper` : undefined;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold uppercase tracking-wider text-stone-700 select-none"
        >
          {label}
          {required && <span className="text-amber-600 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          aria-required={required}
          className={`
            w-full appearance-none bg-stone-50 text-stone-900 text-sm rounded-xl
            border transition-all duration-150 py-2.5 pl-4 pr-10
            ${error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
              : 'border-stone-200 hover:border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/60 focus:bg-white'
            }
            disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed
            focus:outline-none cursor-pointer
            ${className}
          `}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options.length > 0
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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

Select.displayName = 'Select';

export default Select;
