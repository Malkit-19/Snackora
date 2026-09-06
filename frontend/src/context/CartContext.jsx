import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../api/cartApi';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('snackora_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartSummary, setCartSummary] = useState({
    itemsCount: 0,
    subtotal: 0,
    discount: 0,
    delivery: 0,
    tax: 0,
    total: 0,
    isWholesaleView: false,
    freeDeliveryThreshold: 499,
    qualifiesForFreeDelivery: false,
    coupon: null
  });

  const [loading, setLoading] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  const token = localStorage.getItem('snackora_token');

  // Fetch authoritative cart from backend when user is logged in
  const syncBackendCart = useCallback(async () => {
    const activeToken = localStorage.getItem('snackora_token');
    if (!activeToken) {
      return;
    }

    setLoading(true);
    try {
      const res = await cartApi.getCart();
      if (res.success && res.data?.cart) {
        setCartItems(res.data.cart.items || []);
        if (res.data.cart.summary) {
          setCartSummary(res.data.cart.summary);
        }
      }
    } catch (err) {
      console.warn('Failed to sync cart from backend:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      syncBackendCart();
    }
  }, [token, syncBackendCart]);

  // Sync guest cart to localStorage when not logged in & compute guest summary
  useEffect(() => {
    if (!token) {
      try {
        localStorage.setItem('snackora_cart', JSON.stringify(cartItems));
      } catch (e) {
        console.warn('Failed to save cart to localStorage:', e);
      }

      // Compute guest summary dynamically
      const count = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
      const subtotal = cartItems.reduce((acc, item) => {
        const price = item.unitPrice || item.product?.retailDiscountPrice || item.product?.retailPrice || 0;
        return acc + price * (item.quantity || 1);
      }, 0);
      const delivery = subtotal >= 499 || count === 0 ? 0 : 49;
      const tax = Math.round(subtotal * 0.05);
      const total = subtotal + delivery + tax;

      setCartSummary((prev) => ({
        ...prev,
        itemsCount: count,
        subtotal,
        delivery,
        tax,
        total,
        freeDeliveryThreshold: 499,
        qualifiesForFreeDelivery: subtotal >= 499
      }));
    }
  }, [cartItems, token]);

  const addToCart = useCallback(async (product, quantity = 1, isWholesale = false) => {
    const activeToken = localStorage.getItem('snackora_token');

    if (activeToken) {
      try {
        setLoading(true);
        const res = await cartApi.addToCart(product._id || product.slug, quantity);
        if (res.success && res.data?.cart) {
          setCartItems(res.data.cart.items || []);
          setCartSummary(res.data.cart.summary);
          return res.data.cart;
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to add item to cart.';
        toastError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Guest local cart fallback
      setCartItems((prevItems) => {
        const pId = product._id || product.slug;
        const existingIdx = prevItems.findIndex(
          (item) => (item.product?._id || item.product?.slug) === pId
        );
        const effectivePrice = isWholesale && (product.wholesalePrice || product.b2bPrice)
          ? (product.wholesalePrice || product.b2bPrice)
          : (product.retailDiscountPrice || product.retailPrice || 0);

        if (existingIdx > -1) {
          const updated = [...prevItems];
          const newQty = updated[existingIdx].quantity + quantity;
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: newQty,
            total: effectivePrice * newQty
          };
          return updated;
        }

        return [
          ...prevItems,
          {
            _id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            product,
            quantity,
            isWholesale,
            unitPrice: effectivePrice,
            total: effectivePrice * quantity,
            addedAt: new Date().toISOString()
          }
        ];
      });
    }
  }, [toastError]);

  const updateQuantity = useCallback(async (itemIdOrProductId, quantity) => {
    const activeToken = localStorage.getItem('snackora_token');

    if (activeToken) {
      try {
        setLoading(true);
        const res = await cartApi.updateCartItem(itemIdOrProductId, quantity);
        if (res.success && res.data?.cart) {
          setCartItems(res.data.cart.items || []);
          setCartSummary(res.data.cart.summary);
          return res.data.cart;
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to update item quantity.';
        toastError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Guest local cart fallback
      setCartItems((prevItems) => {
        if (quantity <= 0) {
          return prevItems.filter(
            (item) => item._id !== itemIdOrProductId && (item.product?._id || item.product?.slug) !== itemIdOrProductId
          );
        }
        return prevItems.map((item) => {
          if (item._id === itemIdOrProductId || (item.product?._id || item.product?.slug) === itemIdOrProductId) {
            const price = item.unitPrice || item.product?.retailDiscountPrice || item.product?.retailPrice || 0;
            return { ...item, quantity, total: price * quantity };
          }
          return item;
        });
      });
    }
  }, [toastError]);

  const removeFromCart = useCallback(async (itemIdOrProductId) => {
    const activeToken = localStorage.getItem('snackora_token');

    if (activeToken) {
      try {
        setLoading(true);
        const res = await cartApi.removeFromCart(itemIdOrProductId);
        if (res.success && res.data?.cart) {
          setCartItems(res.data.cart.items || []);
          setCartSummary(res.data.cart.summary);
          return res.data.cart;
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to remove item from cart.';
        toastError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Guest local cart fallback
      setCartItems((prevItems) =>
        prevItems.filter(
          (item) => item._id !== itemIdOrProductId && (item.product?._id || item.product?.slug) !== itemIdOrProductId
        )
      );
    }
  }, [toastError]);

  const clearCart = useCallback(async () => {
    const activeToken = localStorage.getItem('snackora_token');

    if (activeToken) {
      try {
        setLoading(true);
        const res = await cartApi.clearCart();
        if (res.success && res.data?.cart) {
          setCartItems([]);
          setCartSummary(res.data.cart.summary);
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to clear cart.';
        toastError(msg);
      } finally {
        setLoading(false);
      }
    } else {
      setCartItems([]);
      localStorage.removeItem('snackora_cart');
    }
  }, [toastError]);

  // Total items count
  const cartCount = cartSummary.itemsCount || cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  // Subtotal
  const cartSubtotal = cartSummary.subtotal || cartItems.reduce((acc, item) => {
    const price = item.unitPrice || item.product?.retailDiscountPrice || item.product?.retailPrice || 0;
    return acc + price * (item.quantity || 1);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        cartSummary,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart: syncBackendCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
