import React from 'react';
import { X } from 'lucide-react';

/**
 * Removable chips for active search & filter criteria
 */
export const ActiveFilterPills = ({
  category,
  flavour,
  minPrice,
  maxPrice,
  inStock,
  minRating,
  search,
  onRemoveFilter,
  onClearAll
}) => {
  const pills = [];

  if (category && category !== 'all') {
    pills.push({
      key: 'category',
      label: `Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`
    });
  }

  if (flavour && flavour !== 'all') {
    pills.push({
      key: 'flavour',
      label: `Flavour: ${flavour.replace('-', ' ').toUpperCase()}`
    });
  }

  if (minPrice || maxPrice) {
    pills.push({
      key: 'price',
      label: `Price: ₹${minPrice || 0} – ₹${maxPrice || '∞'}`
    });
  }

  if (inStock === 'true' || inStock === true) {
    pills.push({
      key: 'inStock',
      label: 'In Stock Only'
    });
  }

  if (minRating) {
    pills.push({
      key: 'minRating',
      label: `Rating: ${minRating}★ & above`
    });
  }

  if (search) {
    pills.push({
      key: 'search',
      label: `Search: "${search}"`
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-bold uppercase tracking-wider text-stone-400 mr-1 select-none">
        Active:
      </span>

      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold select-none shadow-xs"
        >
          <span>{pill.label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(pill.key)}
            aria-label={`Remove filter ${pill.label}`}
            className="text-amber-600 hover:text-amber-950 p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      {pills.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-bold text-stone-500 hover:text-stone-800 underline ml-2 transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

export default ActiveFilterPills;
