import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { marketingApi } from '../api/marketingApi';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Building2,
  ChevronRight,
  Tag,
  Gift
} from 'lucide-react';

export const CartPage = () => {
  const { cartItems, cartCount, cartSummary, cartSubtotal, updateQuantity, removeFromCart, clearCart, loading } = useCart();
  const { user, isApprovedB2B } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const isWholesale = cartSummary?.isWholesaleView || isApprovedB2B;

  const subtotal = cartSummary?.subtotal || cartSubtotal;
  const rawDiscount = appliedCoupon?.discountAmount || cartSummary?.discount || 0;
  const discount = Math.min(rawDiscount, subtotal);
  
  const isFirst3OrdersFree = cartSummary?.isFirst3OrdersFreeDelivery ?? (user ? true : false);
  const freeOrdersRemaining = cartSummary?.freeDeliveryOrdersRemaining ?? 3;
  
  const freeDeliveryThreshold = cartSummary?.freeDeliveryThreshold || (isWholesale ? 2000 : 499);
  const qualifiesThreshold = subtotal >= freeDeliveryThreshold;
  const qualifiesForFreeDelivery = isFirst3OrdersFree || qualifiesThreshold;
  const amountNeededForFreeDelivery = Math.max(freeDeliveryThreshold - subtotal, 0);
  
  const delivery = qualifiesForFreeDelivery ? 0 : 49;
  const tax = Math.round(Math.max(subtotal - discount, 0) * 0.05);
  const total = Math.max(subtotal - discount + delivery + tax, 0);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await marketingApi.validateCoupon(couponCode.trim(), subtotal);
      if (res.success && res.data?.coupon) {
        setAppliedCoupon(res.data.coupon);
        toastSuccess(`Coupon applied! Saved ₹${res.data.coupon.discountAmount}.`);
      }
    } catch (err) {
      toastError(err.message || 'Invalid or expired coupon code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toastSuccess('Coupon removed.');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[75vh] bg-[#FCFAF7] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty."
          description="Add something you love from our delicious snacks and bakes!"
          actionText="Shop Now"
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
          <Link to="/" className="hover:text-amber-700 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/shop" className="hover:text-amber-700 transition-colors">Shop</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-stone-700 font-semibold">Your Cart</span>
        </nav>

        {/* Title & Clear Cart */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Looks tasty!</p>
            {isWholesale && (
              <p className="text-xs text-indigo-700 font-bold flex items-center gap-1 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                Wholesale pricing active
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={clearCart}
            disabled={loading}
            className="text-xs font-bold text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-1 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cart
          </button>
        </div>

        {/* Free delivery banner */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-600" />
              {qualifiesForFreeDelivery ? (
                <strong className="text-emerald-700">Free delivery unlocked! 🎉</strong>
              ) : (
                <>Add <strong className="text-amber-700">₹{amountNeededForFreeDelivery}</strong> more for Free Delivery</>
              )}
            </span>
            <span className="font-mono text-[11px] text-stone-400">
              ₹{subtotal} / ₹{freeDeliveryThreshold}
            </span>
          </div>

          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                qualifiesForFreeDelivery ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{
                width: `${Math.min((subtotal / freeDeliveryThreshold) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            {cartItems.map((item) => {
              const product = item.product || {};
              const itemId = item._id || product._id;
              const unitPrice = isWholesale ? (product.wholesalePrice || product.retailPrice) : (product.retailDiscountPrice || product.retailPrice);
              const itemTotal = unitPrice * item.quantity;
              const moq = isWholesale && product.b2bMoq ? product.b2bMoq : 1;
              const maxStock = product.stock || 999;

              return (
                <div
                  key={itemId}
                  className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-xs hover:border-amber-300 transition-colors"
                >
                  {/* Image */}
                  <Link
                    to={`/products/${product.slug}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-100 shrink-0 self-center sm:self-auto"
                  >
                    <img
                      src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=80'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {product.category && (
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        {product.category.name || product.category}
                      </span>
                    )}

                    <Link
                      to={`/products/${product.slug}`}
                      className="text-sm sm:text-base font-bold text-stone-900 hover:text-amber-700 transition-colors block truncate"
                    >
                      {product.name}
                    </Link>

                    <p className="text-xs text-stone-400">
                      {product.unit || product.weight || '1 unit'}
                      {isWholesale && product.b2bMoq && ` • Min MOQ: ${product.b2bMoq}`}
                    </p>
                    <p className="text-xs font-bold text-amber-700 sm:hidden pt-1">
                      ₹{unitPrice} × {item.quantity} = ₹{itemTotal}
                    </p>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <QuantitySelector
                      quantity={item.quantity}
                      onQuantityChange={(newQty) => updateQuantity(itemId, newQty)}
                      min={moq}
                      max={maxStock}
                      size="sm"
                      isWholesale={isWholesale}
                      moq={moq}
                    />

                    {/* Price total */}
                    <div className="text-right min-w-[80px] hidden sm:block">
                      <p className="text-base font-bold text-stone-900">₹{itemTotal}</p>
                      <p className="text-[11px] text-stone-400">₹{unitPrice}/unit</p>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(itemId)}
                      aria-label={`Remove ${product.name} from cart`}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-4 bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xs sticky top-28">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal ({cartCount} items)</span>
                <span className="font-bold text-stone-900">₹{subtotal}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({appliedCoupon?.code || 'Promo'})</span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Delivery</span>
                <span>
                  {delivery === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      FREE
                    </span>
                  ) : (
                    <strong className="text-stone-900">₹{delivery}</strong>
                  )}
                </span>
              </div>

              {isFirst3OrdersFree && (
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-bold">
                  <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Free delivery active ({freeOrdersRemaining} of 3 left)</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated GST (5%)</span>
                <span className="font-bold text-stone-900">₹{tax}</span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-stone-900">Total</span>
                <span className="text-2xl font-bold text-stone-900">₹{total}</span>
              </div>
            </div>

            {/* Coupon Box */}
            <div className="pt-2 border-t border-stone-100">
              {appliedCoupon ? (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-emerald-900 font-mono">{appliedCoupon.code}</span>
                    <span className="text-xs text-emerald-700 font-bold">(-₹{appliedCoupon.discountAmount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" /> Have a Coupon?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold font-mono text-stone-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={couponLoading || !couponCode.trim()}
                      className="font-bold text-xs shrink-0"
                    >
                      {couponLoading ? 'Applying…' : 'Apply'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Checkout Button */}
            <div className="space-y-3 pt-2">
              <Button
                size="lg"
                fullWidth
                rightIcon={ArrowRight}
                onClick={() => {
                  if (!user) {
                    navigate('/login', { state: { from: { pathname: '/checkout' } } });
                  } else {
                    navigate('/checkout');
                  }
                }}
                className="font-bold py-3.5 shadow-md shadow-amber-600/20"
              >
                Checkout
              </Button>

              <Link
                to="/shop"
                className="block text-center text-xs font-bold text-stone-500 hover:text-amber-700 transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Fast pan-India dispatch</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
