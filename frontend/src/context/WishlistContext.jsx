import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistApi } from '../api/wishlistApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistItems([]);
      return;
    }
    try {
      setLoading(true);
      const res = await wishlistApi.getWishlist();
      if (res.success) {
        setWishlistItems(res.data?.wishlist?.products || []);
      }
    } catch (err) {
      console.warn('Failed to load wishlist:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isInWishlist = (productId) => {
    if (!productId) return false;
    return wishlistItems.some((item) => (item._id || item) === productId);
  };

  const toggleWishlist = async (product) => {
    if (!user) {
      toastError('Please log in to save items to your wishlist.');
      return false;
    }

    const productId = product._id || product;
    const isCurrentlySaved = isInWishlist(productId);

    try {
      if (isCurrentlySaved) {
        const res = await wishlistApi.removeFromWishlist(productId);
        if (res.success) {
          setWishlistItems((prev) => prev.filter((p) => (p._id || p) !== productId));
          toastSuccess(`Removed '${product.name || 'item'}' from your wishlist.`);
          return false;
        }
      } else {
        const res = await wishlistApi.addToWishlist(productId);
        if (res.success) {
          setWishlistItems((prev) => [...prev, product]);
          toastSuccess(`Added '${product.name || 'item'}' to your wishlist.`);
          return true;
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to update wishlist.');
    }
    return isCurrentlySaved;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount: wishlistItems.length,
        loading,
        isInWishlist,
        toggleWishlist,
        refreshWishlist: fetchWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
