import React, { useState } from 'react';
import {
  RotateCcw,
  Check,
  Star,
  SlidersHorizontal,
  Flame,
  Cookie,
  Dumbbell,
  Milk,
  Layers
} from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Desktop sidebar filter component
 */
export const ShopSidebarFilters = ({
  category = '',
  flavour = '',
  minPrice = '',
  maxPrice = '',
  inStock = false,
  minRating = '',
  onFilterChange,
  onResetFilters,
  categories = []
}) => {
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  const makhanaFlavours = [
    { id: 'normal', label: 'Normal / Salted' },
    { id: 'peri-peri', label: 'Peri Peri' },
    { id: 'cream-and-onion', label: 'Cream & Onion' },
    { id: 'black-pepper', label: 'Black Pepper' },
    { id: 'tomato', label: 'Tomato' },
    { id: 'indian-touch', label: 'Indian Touch' }
  ];

  const ratingOptions = [
    { value: '4.8', label: '4.8★ & above' },
    { value: '4.5', label: '4.5★ & above' },
    { value: '4.0', label: '4.0★ & above' }
  ];

  const categoryIcons = {
    cookies: Cookie,
    protein: Dumbbell,
    dairy: Milk,
    makhana: Flame
  };

  const handleApplyPrice = (e) => {
    if (e) e.preventDefault();
    onFilterChange({
      minPrice: localMinPrice || undefined,
      maxPrice: localMaxPrice || undefined
    });
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleApplyPrice();
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header & Reset button */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-700" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">
            Filters
          </h2>
        </div>

        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      {/* 1. Category Filter */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">
          Categories
        </h3>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onFilterChange({ category: undefined })}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left
              ${!category
                ? 'bg-amber-100 text-amber-900 font-bold shadow-xs'
                : 'text-stone-700 hover:bg-stone-100'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>All Categories</span>
            </div>
            {!category && <Check className="w-3.5 h-3.5 text-amber-700" />}
          </button>

          {categories.map((cat) => {
            const isSelected = category.toLowerCase() === cat.slug.toLowerCase();
            const Icon = categoryIcons[cat.slug] || Cookie;

            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => onFilterChange({ category: isSelected ? undefined : cat.slug })}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left
                  ${isSelected
                    ? 'bg-amber-100 text-amber-900 font-bold shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-amber-600" />
                  <span>{cat.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Makhana Flavours Filter */}
      <div className="space-y-3 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Makhana Flavours</span>
          </h3>
          {flavour && (
            <button
              type="button"
              onClick={() => onFilterChange({ flavour: undefined })}
              className="text-[10px] text-stone-400 hover:text-stone-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1">
          {makhanaFlavours.map((item) => {
            const isSelected = flavour.toLowerCase() === item.id.toLowerCase();
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange({ flavour: isSelected ? undefined : item.id })}
                className={`
                  w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left
                  ${isSelected
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }
                `}
              >
                <span>{item.label}</span>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Price Range Filter */}
      <div className="space-y-3 pt-4 border-t border-stone-100">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">
          Price Range (₹)
        </h3>

        <form onSubmit={handleApplyPrice} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-stone-400 font-semibold block mb-1">
                Min Price
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-stone-400">₹</span>
                <input
                  type="number"
                  min={0}
                  placeholder="50"
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-6 pr-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-stone-400 font-semibold block mb-1">
                Max Price
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-stone-400">₹</span>
                <input
                  type="number"
                  min={0}
                  placeholder="500"
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  onKeyDown={handlePriceKeyDown}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-6 pr-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <Button type="submit" variant="secondary" size="sm" fullWidth className="text-xs py-1.5 font-bold">
            Apply Price Filter
          </Button>
        </form>
      </div>

      {/* 4. Availability Filter */}
      <div className="space-y-2 pt-4 border-t border-stone-100">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">
          Availability
        </h3>

        <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-stone-50 cursor-pointer text-xs font-semibold text-stone-700">
          <input
            type="checkbox"
            checked={Boolean(inStock)}
            onChange={(e) =>
              onFilterChange({ inStock: e.target.checked ? 'true' : undefined })
            }
            className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* 5. Rating Filter */}
      <div className="space-y-2 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">
            Customer Rating
          </h3>
          {minRating && (
            <button
              type="button"
              onClick={() => onFilterChange({ minRating: undefined })}
              className="text-[10px] text-stone-400 hover:text-stone-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1">
          {ratingOptions.map((opt) => {
            const isSelected = minRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onFilterChange({ minRating: isSelected ? undefined : opt.value })
                }
                className={`
                  w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left
                  ${isSelected
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-stone-600 hover:bg-stone-100'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-amber-700" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShopSidebarFilters;
