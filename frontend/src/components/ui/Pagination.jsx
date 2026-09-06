import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Accessible Pagination component with smart ellipsis
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  className = ''
}) => {
  if (totalPages <= 1) return null;

  // Generate page range with ellipsis
  const generatePagination = () => {
    const totalNumbers = siblingCount * 2 + 3; // current + siblings + first + last
    const totalBlocks = totalNumbers + 2; // + 2 for ellipses

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return [];
  };

  const pages = generatePagination();

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex items-center justify-center gap-1.5 sm:gap-2 ${className}`}
    >
      {/* Previous Page Button */}
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
        className="
          flex items-center justify-center p-2 rounded-xl text-stone-700
          border border-stone-200 bg-white hover:bg-stone-50 hover:border-amber-300
          disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-stone-200 disabled:cursor-not-allowed
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        "
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Number Buttons */}
      {pages.map((page, idx) => {
        if (page === '...') {
          return (
            <span
              key={`dots-${idx}`}
              className="px-2 py-1 text-xs text-stone-400 select-none"
            >
              …
            </span>
          );
        }

        const isCurrent = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={isCurrent ? 'page' : undefined}
            className={`
              min-w-[36px] h-9 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
              ${isCurrent
                ? 'bg-amber-600 text-white shadow-sm border border-amber-600'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50'
              }
            `}
          >
            {page}
          </button>
        );
      })}

      {/* Next Page Button */}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
        className="
          flex items-center justify-center p-2 rounded-xl text-stone-700
          border border-stone-200 bg-white hover:bg-stone-50 hover:border-amber-300
          disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-stone-200 disabled:cursor-not-allowed
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        "
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
};

export default Pagination;
