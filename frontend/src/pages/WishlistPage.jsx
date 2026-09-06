import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/product/ProductCard';

export const WishlistPage = () => {
  const { user } = useAuth();
  const { wishlistItems, wishlistCount } = useWishlist();

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Your Wishlist is Waiting</h2>
        <p className="text-xs text-stone-500 max-w-sm">
          Log in to view your saved favourites and order anytime.
        </p>
        <Link
          to="/login"
          state={{ from: { pathname: '/wishlist' } }}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
            <Heart className="w-7 h-7 fill-rose-500 text-rose-500" />
            Wishlist ({wishlistCount})
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Your saved favourites. Ready to add to cart whenever you want.
          </p>
        </div>

        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
        >
          Explore Shop <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid or Empty State */}
      {wishlistCount === 0 ? (
        <div className="py-20 text-center space-y-4 bg-stone-50 rounded-3xl border border-dashed border-stone-200 max-w-xl mx-auto">
          <Heart className="w-12 h-12 mx-auto text-stone-300" />
          <h3 className="text-lg font-bold text-stone-800">Your wishlist is empty.</h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Tap the heart icon on any snack to save it here for later!
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md shadow-amber-500/20"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistItems.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
