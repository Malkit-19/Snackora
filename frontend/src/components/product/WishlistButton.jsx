import React from 'react';
import { Heart } from 'lucide-react';

/**
 * Accessible Wishlist heart toggle button with pop animation
 */
export const WishlistButton = ({
  isWishlisted = false,
  onToggle,
  size = 'md',
  className = '',
  ariaLabel
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const label = ariaLabel || (isWishlisted ? 'Remove from wishlist' : 'Add to wishlist');

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={isWishlisted}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-full
        bg-white/90 backdrop-blur-sm border border-stone-200/80 shadow-sm
        hover:scale-110 active:scale-95 transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        ${isWishlisted ? 'text-rose-500 hover:text-rose-600' : 'text-stone-400 hover:text-stone-700'}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
    >
      <Heart
        className={`
          ${iconSizes[size] || iconSizes.md} transition-colors
          ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}
        `}
        aria-hidden="true"
      />
    </button>
  );
};

export default WishlistButton;
