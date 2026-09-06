import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Accessible Quantity Selector with B2B MOQ awareness
 */
export const QuantitySelector = ({
  // Accept both naming conventions: value/onChange (ProductCard) and quantity/onQuantityChange (CartPage, ProductDetailPage)
  value,
  quantity,
  onChange,
  onQuantityChange,
  min = 1,
  max = 9999,
  step = 1,
  b2bMoq,
  moq,
  isWholesale = false,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  // Resolve the actual current quantity from either prop name
  const currentValue = value !== undefined ? value : (quantity !== undefined ? quantity : 1);
  // Resolve the change handler from either prop name
  const handleChange = onChange || onQuantityChange || (() => {});

  // If wholesale mode is active and MOQ is specified, enforce MOQ as minimum
  const effectiveMoq = moq || b2bMoq;
  const effectiveMin = isWholesale && effectiveMoq ? Math.max(min, effectiveMoq) : min;

  const handleDecrement = () => {
    if (disabled || currentValue <= effectiveMin) return;
    handleChange(Math.max(currentValue - step, effectiveMin));
  };

  const handleIncrement = () => {
    if (disabled || currentValue >= max) return;
    handleChange(Math.min(currentValue + step, max));
  };


  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      handleChange(effectiveMin);
      return;
    }
    const num = parseInt(rawVal, 10);
    if (!isNaN(num)) {
      if (num < effectiveMin) {
        handleChange(effectiveMin);
      } else if (num > max) {
        handleChange(max);
      } else {
        handleChange(num);
      }
    }
  };


  const sizeClasses = {
    sm: {
      btn: 'w-7 h-7',
      input: 'w-10 text-xs h-7',
      icon: 'w-3 h-3'
    },
    md: {
      btn: 'w-9 h-9',
      input: 'w-14 text-sm h-9',
      icon: 'w-3.5 h-3.5'
    },
    lg: {
      btn: 'w-11 h-11',
      input: 'w-16 text-base h-11',
      icon: 'w-4 h-4'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`
        inline-flex items-center rounded-2xl border border-stone-200 bg-white
        shadow-sm overflow-hidden select-none
        ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-50' : ''}
        ${className}
      `}
    >
      {/* Decrement Button */}
      <button
        type="button"
        disabled={disabled || currentValue <= effectiveMin}
        onClick={handleDecrement}
        aria-label="Decrease quantity"
        className={`
          ${currentSize.btn} flex items-center justify-center
          text-stone-600 hover:text-amber-700 hover:bg-stone-50
          disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed
          transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500
        `}
      >
        <Minus className={currentSize.icon} aria-hidden="true" />
      </button>

      {/* Numerical Input */}
      <input
        type="number"
        min={effectiveMin}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={handleInputChange}
        aria-label="Quantity"
        className={`
          ${currentSize.input} text-center font-bold text-stone-900 bg-transparent
          border-x border-stone-100 focus:outline-none focus:bg-amber-50/40
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        `}
      />

      {/* Increment Button */}
      <button
        type="button"
        disabled={disabled || currentValue >= max}
        onClick={handleIncrement}
        aria-label="Increase quantity"
        className={`
          ${currentSize.btn} flex items-center justify-center
          text-stone-600 hover:text-amber-700 hover:bg-stone-50
          disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed
          transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500
        `}
      >
        <Plus className={currentSize.icon} aria-hidden="true" />
      </button>
    </div>
  );
};

export default QuantitySelector;

