import React, { useEffect } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import ShopSidebarFilters from './ShopSidebarFilters';

/**
 * Slide-over filter modal for mobile viewports
 */
export const ShopMobileFilterDrawer = ({
  isOpen,
  onClose,
  activeFilterCount = 0,
  category,
  flavour,
  minPrice,
  maxPrice,
  inStock,
  minRating,
  onFilterChange,
  onResetFilters,
  categories = []
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Filter Products"
    >
      <div className="w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-700" />
            <h2 className="text-base font-black text-stone-900">Filter Catalogue</h2>
            {activeFilterCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Scrollable Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          <ShopSidebarFilters
            category={category}
            flavour={flavour}
            minPrice={minPrice}
            maxPrice={maxPrice}
            inStock={inStock}
            minRating={minRating}
            onFilterChange={onFilterChange}
            onResetFilters={onResetFilters}
            categories={categories}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={onResetFilters}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={onClose}
            rightIcon={Check}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShopMobileFilterDrawer;
