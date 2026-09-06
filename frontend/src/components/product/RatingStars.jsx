import React, { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Accessible 5-star rating display and interactive input
 */
export const RatingStars = ({
  rating = 0,
  maxRating = 5,
  count,
  size = 'sm',
  interactive = false,
  onChange,
  className = ''
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const currentSize = starSizes[size] || starSizes.sm;
  const currentTextSize = textSizes[size] || textSizes.sm;

  const effectiveRating = hoverRating || rating;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${rating} out of ${maxRating} stars`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = effectiveRating >= starValue;
          const isHalf = !isFilled && effectiveRating >= starValue - 0.5;

          if (interactive) {
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={rating === starValue}
                aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
                onClick={() => onChange && onChange(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 text-stone-300 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded transition-colors"
              >
                <Star
                  className={`
                    ${currentSize} transition-transform active:scale-125
                    ${isFilled ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
                  `}
                  aria-hidden="true"
                />
              </button>
            );
          }

          return (
            <Star
              key={index}
              className={`
                ${currentSize}
                ${isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : isHalf
                  ? 'text-amber-400 fill-amber-400/50'
                  : 'text-stone-300'
                }
              `}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {rating > 0 && !interactive && (
        <span className={`${currentTextSize} font-bold text-stone-700 select-none`}>
          {Number(rating).toFixed(1)}
        </span>
      )}

      {count !== undefined && !interactive && (
        <span className={`${currentTextSize} text-stone-400 font-normal select-none`}>
          ({count})
        </span>
      )}
    </div>
  );
};

export default RatingStars;
