import React from 'react';
import ProductCard from './ProductCard';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

/**
 * Responsive ProductGrid adapting smoothly from 320px to 1440px
 */
export const ProductGrid = ({
  products = [],
  loading = false,
  skeletonCount = 8,
  isWholesale = false,
  wishlistIds = [],
  onToggleWishlist,
  onAddToCart,
  emptyTitle = 'No products found',
  emptyDescription = 'We could not find any snacks matching your filter. Try adjusting your search.',
  onEmptyAction,
  emptyActionText = 'Browse All Snacks',
  className = ''
}) => {
  if (loading) {
    return (
      <div
        className={`
          grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6
          ${className}
        `}
        aria-busy="true"
        aria-label="Loading products"
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Skeleton key={index} variant="card" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={onEmptyAction ? emptyActionText : undefined}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div
      className={`
        grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6
        ${className}
      `}
      role="region"
      aria-label="Product catalogue grid"
    >
      {products.map((product) => {
        const isWishlisted = wishlistIds.includes(product._id || product.id);
        return (
          <ProductCard
            key={product._id || product.slug}
            product={product}
            isWholesale={isWholesale}
            isWishlisted={isWishlisted}
            onToggleWishlist={onToggleWishlist}
            onAddToCart={onAddToCart}
          />
        );
      })}
    </div>
  );
};

export default ProductGrid;
