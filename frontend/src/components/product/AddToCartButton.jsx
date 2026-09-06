import React from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import Button from '../ui/Button';

/**
 * AddToCartButton with out-of-stock handling, B2B MOQ checks, and loading states
 */
export const AddToCartButton = ({
  product,
  quantity = 1,
  onAdd,
  isInCart = false,
  cartQuantity = 0,
  loading = false,
  disabled = false,
  isWholesale = false,
  size = 'md',
  fullWidth = false,
  className = ''
}) => {
  const isOutOfStock = product?.stock !== undefined && product.stock <= 0;
  const isBelowMoq = isWholesale && product?.b2bMoq && quantity < product.b2bMoq;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isOutOfStock || isBelowMoq || loading) return;
    if (onAdd) {
      onAdd(product, quantity);
    }
  };

  if (isOutOfStock) {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        fullWidth={fullWidth}
        className={`opacity-60 text-stone-400 cursor-not-allowed ${className}`}
      >
        Out of Stock
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={isWholesale ? 'b2b' : 'primary'}
      loading={loading}
      disabled={disabled || isBelowMoq}
      fullWidth={fullWidth}
      onClick={handleClick}
      leftIcon={isInCart ? Check : ShoppingBag}
      className={`relative ${className}`}
      aria-label={
        isInCart
          ? `Added ${cartQuantity} to cart`
          : `Add ${product?.name || 'item'} to cart`
      }
    >
      {isInCart ? (
        <span>Added ({cartQuantity})</span>
      ) : isBelowMoq ? (
        <span>Min MOQ: {product.b2bMoq}</span>
      ) : isWholesale ? (
        <span>Add Bulk Order</span>
      ) : (
        <span>Add to Cart</span>
      )}
    </Button>
  );
};

export default AddToCartButton;
