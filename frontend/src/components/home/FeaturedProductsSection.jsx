import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalogApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { ProductGrid } from '../product/ProductGrid';
import { Badge } from '../ui/Badge';
import { ArrowRight } from 'lucide-react';

export const FeaturedProductsSection = () => {
  const { isApprovedB2B } = useAuth();
  const { addToCart } = useCart();
  const { success, info } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const res = await catalogApi.getFeaturedProducts();
        if (res.success && res.data?.products) {
          setProducts(res.data.products);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, [isApprovedB2B]);

  const handleAddToCart = (product, quantity) => {
    addToCart(product, quantity, isApprovedB2B);
    success(`Added to your cart!`);
  };

  const handleToggleWishlist = (product) => {
    const pId = product._id;
    if (wishlistIds.includes(pId)) {
      setWishlistIds((prev) => prev.filter((id) => id !== pId));
      info(`Removed from your wishlist.`);
    } else {
      setWishlistIds((prev) => [...prev, pId]);
      success(`Saved to your wishlist.`);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 block">
              Popular Picks
            </span>
            {isApprovedB2B && (
              <Badge variant="b2b" size="xs" dot>
                Wholesale Prices
              </Badge>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Best Sellers
          </h2>
        </div>

        <Link
          to="/shop"
          className="text-xs sm:text-sm font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto group"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        loading={loading}
        skeletonCount={4}
        isWholesale={isApprovedB2B}
        wishlistIds={wishlistIds}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        emptyTitle="Nothing here yet."
        emptyDescription="We're adding fresh batches soon. Check back shortly!"
      />
    </section>
  );
};

export default FeaturedProductsSection;
