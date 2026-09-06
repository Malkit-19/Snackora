import React from 'react';
import { Badge } from '../ui/Badge';
import { Building2 } from 'lucide-react';

/**
 * Reusable PriceDisplay supporting Retail and Approved B2B Wholesale Pricing
 */
export const PriceDisplay = ({
  retailPrice,
  retailDiscountPrice,
  wholesalePrice,
  b2bMoq,
  isWholesale = false,
  size = 'md',
  showMoq = true,
  className = ''
}) => {
  const isWholesaleActive = isWholesale && wholesalePrice !== undefined;
  const currentPrice = isWholesaleActive
    ? wholesalePrice
    : retailDiscountPrice || retailPrice;

  const originalPrice = isWholesaleActive
    ? retailPrice
    : retailDiscountPrice ? retailPrice : null;

  const discountPercent = originalPrice && originalPrice > currentPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const sizeClasses = {
    sm: {
      current: 'text-base font-bold',
      original: 'text-xs',
      moq: 'text-[10px]'
    },
    md: {
      current: 'text-xl font-bold',
      original: 'text-sm',
      moq: 'text-xs'
    },
    lg: {
      current: 'text-3xl font-bold',
      original: 'text-base',
      moq: 'text-sm'
    }
  };


  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-baseline flex-wrap gap-2">
        {/* Current Active Price */}
        <span
          className={`
            ${currentSize.current} tracking-tight
            ${isWholesaleActive ? 'text-indigo-700' : 'text-stone-900'}
          `}
        >
          ₹{currentPrice}
        </span>

        {/* Strikethrough Original Price */}
        {originalPrice && (
          <span className={`${currentSize.original} text-stone-400 line-through font-medium`}>
            ₹{originalPrice}
          </span>
        )}

        {/* Savings Badge */}
        {discountPercent && discountPercent > 0 && (
          <Badge
            variant={isWholesaleActive ? 'b2b' : 'success'}
            size="xs"
          >
            {isWholesaleActive ? `Bulk Save ${discountPercent}%` : `Save ${discountPercent}%`}
          </Badge>
        )}
      </div>

      {/* B2B wholesale MOQ indicator */}
      {isWholesaleActive && showMoq && b2bMoq && (
        <div className="flex items-center gap-1.5 text-indigo-700">
          <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span className={`${currentSize.moq} font-bold uppercase tracking-wider`}>
            B2B MOQ: {b2bMoq} Units
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceDisplay;
