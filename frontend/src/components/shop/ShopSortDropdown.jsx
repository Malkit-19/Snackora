import React from 'react';
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

/**
 * Top control bar with product count, mobile filter trigger, and sort selector
 */
export const ShopSortDropdown = ({
  sort = 'popular',
  onSortChange,
  totalProducts = 0,
  currentPage = 1,
  limit = 8,
  onOpenMobileFilters,
  activeFilterCount = 0
}) => {
  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' }
  ];

  const startCount = totalProducts === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endCount = Math.min(currentPage * limit, totalProducts);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
      {/* Product count display */}
      <div className="flex items-center gap-3">
        {/* Mobile filter button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenMobileFilters}
          className="lg:hidden font-bold"
          leftIcon={SlidersHorizontal}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-amber-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <p className="text-xs sm:text-sm text-stone-500 font-medium">
          {totalProducts > 0 ? (
            <>
              Showing <strong className="text-stone-900">{startCount}–{endCount}</strong> of{' '}
              <strong className="text-stone-900">{totalProducts}</strong> snacks
            </>
          ) : (
            'No products available'
          )}
        </p>
      </div>

      {/* Sort Select */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400 hidden sm:inline-block">
          Sort by:
        </span>
        <div className="w-48 sm:w-52">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort product catalog"
            className="w-full bg-white text-stone-900 text-xs sm:text-sm font-semibold rounded-xl border border-stone-300 py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ShopSortDropdown;
