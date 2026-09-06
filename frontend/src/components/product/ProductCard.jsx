import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import PriceDisplay from './PriceDisplay';
import RatingStars from './RatingStars';
import WishlistButton from './WishlistButton';
import AddToCartButton from './AddToCartButton';
import QuantitySelector from './QuantitySelector';

/**
 * Reusable ProductCard with dual-pricing, stock badges, and wishlist toggle
 */
export const ProductCard = ({
  product,
  isWholesale = false,
  isWishlisted = false,
  onToggleWishlist,
  onAddToCart,
  className = '',
  showQuantitySelector = false
}) => {
  if (!product) return null;

  const defaultMoq = isWholesale && product.b2bMoq ? product.b2bMoq : 1;
  const [quantity, setQuantity] = useState(defaultMoq);
  const [imgSrc, setImgSrc] = useState(
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80'
  );

  const fallbackImage =
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80';

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 15;

  return (
    <Card
      hoverable
      className={`flex flex-col justify-between group h-full relative ${className}`}
    >
      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-stone-100 rounded-t-3xl">
        <Link
          to={`/products/${product.slug}`}
          className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          tabIndex={0}
          aria-label={`View details for ${product.name}`}
        >
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgSrc(fallbackImage)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
          />
        </Link>

        {/* Top-left badges: Unit & Stock status */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {product.unit && (
            <span className="bg-stone-900/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
              {product.unit}
            </span>
          )}

          {isOutOfStock ? (
            <Badge variant="danger" size="sm">
              Out of Stock
            </Badge>
          ) : isLowStock ? (
            <Badge variant="warning" size="sm">
              Only {product.stock} left
            </Badge>
          ) : null}

          {product.isFeatured && !isOutOfStock && (
            <Badge variant="primary" size="sm">
              Featured
            </Badge>
          )}
        </div>

        {/* Top-right: Wishlist Heart Button */}
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton
            isWishlisted={isWishlisted}
            onToggle={() => onToggleWishlist && onToggleWishlist(product)}
            size="sm"
            ariaLabel={`Add ${product.name} to wishlist`}
          />
        </div>
      </div>

      {/* Product Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Category & Rating */}
          <div className="flex items-center justify-between gap-2 text-xs">
            {product.category && (
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider truncate">
                {product.category.name || product.category}
              </span>
            )}
            <RatingStars
              rating={product.ratings?.average || 4.8}
              count={product.ratings?.count}
              size="sm"
            />
          </div>

          {/* Product Name */}
          <Link
            to={`/products/${product.slug}`}
            className="block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
          >
            <h3 className="font-semibold text-stone-900 text-base sm:text-lg leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
              {product.name}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-xs sm:text-sm text-stone-600 font-normal line-clamp-2 leading-relaxed">
            {product.shortDescription || product.description}
          </p>
        </div>

        {/* Pricing & Add To Cart Actions */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <PriceDisplay
              retailPrice={product.retailPrice}
              retailDiscountPrice={product.retailDiscountPrice}
              wholesalePrice={product.wholesalePrice}
              b2bMoq={product.b2bMoq}
              isWholesale={isWholesale}
              size="sm"
            />
          </div>

          {/* Optional inline quantity selector */}
          {showQuantitySelector && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-500">Qty:</span>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                min={isWholesale && product.b2bMoq ? product.b2bMoq : 1}
                max={product.stock || 999}
                b2bMoq={product.b2bMoq}
                isWholesale={isWholesale}
                size="sm"
              />
            </div>
          )}

          {/* Add to Cart button */}
          <AddToCartButton
            product={product}
            quantity={quantity}
            onAdd={onAddToCart}
            isWholesale={isWholesale}
            size="sm"
            fullWidth
          />
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
