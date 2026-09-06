import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import SEO from '../components/common/SEO';
import { AdPlacement } from '../components/common/AdPlacement';


// Components
import { ProductGrid } from '../components/product/ProductGrid';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Badge } from '../components/ui/Badge';
import {
  ShopSidebarFilters,
  ShopMobileFilterDrawer,
  ShopSortDropdown,
  ActiveFilterPills
} from '../components/shop';

import { Building2, Sparkles, SlidersHorizontal } from 'lucide-react';


/**
 * Complete Shop page with bidirectional URL query binding,
 * categories, flavours, price range, stock, rating filters, sorting,
 * and server-side pagination.
 */
export const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current query params from URL
  const categoryParam = searchParams.get('category') || '';
  const flavourParam = searchParams.get('flavour') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const inStockParam = searchParams.get('inStock') || '';
  const minRatingParam = searchParams.get('minRating') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'popular';
  const pageParam = parseInt(searchParams.get('page'), 10) || 1;

  // Contexts
  const { user, isApprovedB2B } = useAuth();
  const { addToCart } = useCart();
  const { success, info } = useToast();

  // States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 8
  });
  const [isWholesaleView, setIsWholesaleView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);

  // Fetch categories once
  useEffect(() => {
    catalogApi.getCategories()
      .then((res) => {
        if (res.success && res.data?.categories) {
          setCategories(res.data.categories);
        }
      })
      .catch((err) => console.warn('Categories load error:', err));
  }, []);

  // Fetch filtered products whenever URL query params change
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        category: categoryParam || undefined,
        flavour: flavourParam || undefined,
        minPrice: minPriceParam || undefined,
        maxPrice: maxPriceParam || undefined,
        inStock: inStockParam || undefined,
        minRating: minRatingParam || undefined,
        search: searchParam || undefined,
        sort: sortParam || 'popular',
        page: pageParam,
        limit: 8
      };

      const res = await catalogApi.getProducts(params);

      if (res.success && res.data) {
        setProducts(res.data.products || []);
        setPagination(res.data.pagination || { total: 0, page: 1, pages: 1, limit: 8 });
        setIsWholesaleView(Boolean(res.data.isWholesaleView));
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Failed to load shop products:', err);
      setError(err.message || 'Unable to connect to the product service.');
    } finally {
      setLoading(false);
    }
  }, [
    categoryParam,
    flavourParam,
    minPriceParam,
    maxPriceParam,
    inStockParam,
    minRatingParam,
    searchParam,
    sortParam,
    pageParam,
    isApprovedB2B
  ]);

  useEffect(() => {
    fetchProducts();
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchProducts]);

  // Synchronize new filter changes with URL
  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'all') {
        updated.delete(key);
      } else {
        updated.set(key, String(value));
      }
    });

    // Reset to page 1 on filter modification (unless explicitly changing page)
    if (!('page' in newParams)) {
      updated.delete('page');
    }

    setSearchParams(updated);
  };

  const handlePageChange = (newPage) => {
    updateFilters({ page: newPage });
  };

  const handleSortChange = (newSort) => {
    updateFilters({ sort: newSort });
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleRemoveIndividualFilter = (filterKey) => {
    if (filterKey === 'price') {
      updateFilters({ minPrice: undefined, maxPrice: undefined });
    } else {
      updateFilters({ [filterKey]: undefined });
    }
  };

  // Add to cart with B2B wholesale flag
  const handleAddToCart = (product, quantity) => {
    addToCart(product, quantity, isWholesaleView);
    success(`Added ${quantity}x "${product.name}" to your cart.`);
  };

  const handleToggleWishlist = (product) => {
    const pId = product._id;
    if (wishlistIds.includes(pId)) {
      setWishlistIds((prev) => prev.filter((id) => id !== pId));
      info(`Removed "${product.name}" from your wishlist.`);
    } else {
      setWishlistIds((prev) => [...prev, pId]);
      success(`Saved "${product.name}" to your wishlist!`);
    }
  };

  // Count active filters for badge
  const activeFilterCount = [
    categoryParam,
    flavourParam,
    minPriceParam || maxPriceParam,
    inStockParam,
    minRatingParam,
    searchParam
  ].filter(Boolean).length;

  const shopTitle = categoryParam
    ? `${categoryParam.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Snacks`
    : searchParam
      ? `Search: ${searchParam}`
      : 'Shop All Snacks';

  const shopDesc = categoryParam
    ? `Browse premium ${categoryParam.replace(/-/g, ' ')} from Snackora — handcrafted, freshly packed, fast delivery.`
    : 'Explore Snackora\'s full range of premium handcrafted snacks — Makhana, Gourmet Chips, Butter Cookies, Healthy Nuts and more.';

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-8 sm:py-12">
      <SEO
        title={shopTitle}
        description={shopDesc}
        url={`https://www.snackora.in/shop${categoryParam ? `?category=${categoryParam}` : ''}`}
        type="website"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Shop Banner / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                Snackora Pantry
              </span>
              {isWholesaleView && (
                <Badge variant="b2b" size="xs" dot>
                  Wholesale Tier Active
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight capitalize">
              {categoryParam
                ? categoryParam.replace(/-/g, ' ')
                : 'All Snacks'}
            </h1>

            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
              Fresh snacks and tasty treats made for every mood.
            </p>
          </div>
        </div>

        {/* Live Shop Promo Ad */}
        <AdPlacement placement="SHOP" />

        {/* B2B Info Banner if Approved */}
        {isWholesaleView && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs sm:text-sm flex items-center gap-3">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold block text-sm">Wholesale Pricing Applied</span>
              <span className="text-xs text-stone-600">Your bulk discounts and minimum order quantities are active.</span>
            </div>
          </div>
        )}


        {/* Main Grid: Desktop Sticky Sidebar (3 cols) + Product Area (9 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm">
            <ShopSidebarFilters
              category={categoryParam}
              flavour={flavourParam}
              minPrice={minPriceParam}
              maxPrice={maxPriceParam}
              inStock={inStockParam}
              minRating={minRatingParam}
              onFilterChange={updateFilters}
              onResetFilters={handleResetFilters}
              categories={categories}
            />
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-9 space-y-6">
            {/* Top Controls: Count, Mobile Filter Trigger & Sort Dropdown */}
            <ShopSortDropdown
              sort={sortParam}
              onSortChange={handleSortChange}
              totalProducts={pagination.total}
              currentPage={pagination.page}
              limit={pagination.limit}
              onOpenMobileFilters={() => setMobileFiltersOpen(true)}
              activeFilterCount={activeFilterCount}
            />

            {/* Active Filter Chips */}
            <ActiveFilterPills
              category={categoryParam}
              flavour={flavourParam}
              minPrice={minPriceParam}
              maxPrice={maxPriceParam}
              inStock={inStockParam}
              minRating={minRatingParam}
              search={searchParam}
              onRemoveFilter={handleRemoveIndividualFilter}
              onClearAll={handleResetFilters}
            />

            {/* 1. API Error State */}
            {error && (
              <ErrorState
                title="Failed to Load Products"
                message={error}
                onRetry={fetchProducts}
                retryText="Retry Catalog"
                secondaryActionText="Reset All Filters"
                onSecondaryAction={handleResetFilters}
              />
            )}

            {/* 2. Loading State */}
            {!error && loading && (
              <ProductGrid loading skeletonCount={8} />
            )}

            {/* 3. Empty State (No products matching filters) */}
            {!error && !loading && products.length === 0 && (
              <EmptyState
                title="No snacks match your filters"
                description="We couldn't find any items matching your selected category, flavour, or price criteria. Try adjusting your filters."
                actionText="Reset All Filters"
                onAction={handleResetFilters}
              />
            )}

            {/* 4. Products Available State */}
            {!error && !loading && products.length > 0 && (
              <div className="space-y-10">
                <ProductGrid
                  products={products}
                  isWholesale={isWholesaleView}
                  wishlistIds={wishlistIds}
                  onToggleWishlist={handleToggleWishlist}
                  onAddToCart={handleAddToCart}
                />

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="pt-6 border-t border-stone-200">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      <ShopMobileFilterDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        activeFilterCount={activeFilterCount}
        category={categoryParam}
        flavour={flavourParam}
        minPrice={minPriceParam}
        maxPrice={maxPriceParam}
        inStock={inStockParam}
        minRating={minRatingParam}
        onFilterChange={updateFilters}
        onResetFilters={handleResetFilters}
        categories={categories}
      />
    </div>
  );
};

export default ShopPage;
