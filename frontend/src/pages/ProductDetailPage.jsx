import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { catalogApi } from '../api/catalogApi';
import SEO, { buildProductLD } from '../components/common/SEO';
import { AdPlacement } from '../components/common/AdPlacement';

// UI Primitives
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';

// Product Components
import ProductImageGallery from '../components/product/ProductImageGallery';
import { RatingStars } from '../components/product/RatingStars';
import { PriceDisplay } from '../components/product/PriceDisplay';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { WishlistButton } from '../components/product/WishlistButton';
import { ProductGrid } from '../components/product/ProductGrid';
import { ProductReviewsSection } from '../components/review/ProductReviewsSection';


import {
  ShoppingBag,
  Zap,
  Package,
  Tag,
  Weight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronRight,
  Info,
  Leaf
} from 'lucide-react';

/**
 * Full Product Detail Page:
 * – Image gallery + info on desktop (side-by-side)
 * – Stacked on mobile
 * – Dual pricing (server-authoritative B2B vs Retail)
 * – Quantity selector with stock / MOQ validation
 * – Add to Cart, Buy Now, Wishlist
 * – Related products grid
 * – Reviews section
 */
export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isApprovedB2B } = useAuth();
  const { addToCart } = useCart();
  const { success, error: toastError, info } = useToast();

  const [product, setProduct] = useState(null);
  const [isWholesaleView, setIsWholesaleView] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews] = useState([]);  // Ready for API: GET /api/v1/products/:id/reviews

  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeTab, setActiveTab] = useState('description'); // description | ingredients | reviews

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await catalogApi.getProductBySlug(slug);

      if (res.success && res.data?.product) {
        setProduct(res.data.product);
        setIsWholesaleView(Boolean(res.data.isWholesaleView));

        // Set initial quantity to MOQ for B2B
        const p = res.data.product;
        if (res.data.isWholesaleView && p.b2bMoq) {
          setQuantity(p.b2bMoq);
        } else {
          setQuantity(1);
        }
      } else {
        setLoadError('Product not found.');
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load product. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchProduct]);

  // Fetch related products once product is loaded
  useEffect(() => {
    if (!product?.category?.slug) return;
    setRelatedLoading(true);

    catalogApi
      .getRelatedProducts(product.category.slug, slug)
      .then((res) => {
        if (res.success && res.data?.products) {
          setRelatedProducts(res.data.products.slice(0, 4));
        }
      })
      .catch(console.error)
      .finally(() => setRelatedLoading(false));
  }, [product, slug]);

  const handleAddToCart = () => {
    if (!product) return;

    if (product.stock <= 0) {
      toastError('This product is currently out of stock.');
      return;
    }

    addToCart(product, quantity, isWholesaleView);
    success(`Added ${quantity}× "${product.name}" to your cart!`);
  };

  const handleBuyNow = () => {
    if (!product || product.stock <= 0) return;

    addToCart(product, quantity, isWholesaleView);
    navigate('/cart');
  };

  const handleWishlistToggle = () => {
    setIsWishlisted((prev) => {
      if (prev) {
        info(`Removed "${product?.name}" from wishlist.`);
        return false;
      } else {
        success(`Saved "${product?.name}" to your wishlist!`);
        return true;
      }
    });
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFAF7]">
        <div className="text-center space-y-4">
          <Spinner size="xl" />
          <p className="text-stone-500 text-sm font-medium">Loading product details…</p>
        </div>
      </div>
    );
  }

  // ---- Error State ----
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center p-8">
        <ErrorState
          title="Couldn't load this product"
          message={loadError}
          onRetry={fetchProduct}
          retryText="Retry"
          secondaryActionText="Browse Shop"
          onSecondaryAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  if (!product) return null;

  // ---- Derived values ----
  const inStock = product.stock > 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const effectivePrice = isWholesaleView ? product.wholesalePrice : (product.retailDiscountPrice || product.retailPrice);

  // ---- SEO data ----
  const primaryImage = Array.isArray(product.images) && product.images.length > 0
    ? (product.images.find(i => i.isPrimary)?.url || product.images[0]?.url)
    : undefined;
  const seoDescription = product.description
    ? product.description.replace(/<[^>]+>/g, '').slice(0, 160)
    : `Buy ${product.name} online — premium handcrafted snack from Snackora.`;
  const productLD = buildProductLD(
    product,
    product.ratings?.count ?? product.reviewCount,
    product.ratings?.average ?? product.rating
  );

  return (
    <div className="min-h-screen bg-[#FCFAF7] pb-16">
      <SEO
        title={product.name}
        description={seoDescription}
        image={primaryImage}
        url={`https://www.snackora.in/products/${product.slug}`}
        type="product"
        structuredData={productLD}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4"
      >
        <ol className="flex items-center gap-1.5 text-xs text-stone-400 font-medium flex-wrap">
          <li><Link to="/" className="hover:text-amber-700 transition-colors">Home</Link></li>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <li><Link to="/shop" className="hover:text-amber-700 transition-colors">Shop</Link></li>
          {product.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <li>
                <Link
                  to={`/shop?category=${product.category.slug}`}
                  className="hover:text-amber-700 transition-colors"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <li className="text-stone-700 font-semibold truncate max-w-[180px]">{product.name}</li>
        </ol>
      </nav>

      {/* Main Product Layout: Image Gallery + Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* Left: Image Gallery (lg: sticky) */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-28 self-start">
            <ProductImageGallery
              images={product.images || []}
              productName={product.name}
            />
          </div>

          {/* Right: Product Information */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">

            {/* Category & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Link to={`/shop?category=${product.category.slug}`}>
                  <Badge variant="secondary" size="sm">
                    {product.category.name}
                  </Badge>
                </Link>
              )}
              {product.isFeatured && (
                <Badge variant="primary" size="sm" dot>Bestseller</Badge>
              )}
              {isWholesaleView && (
                <Badge variant="b2b" size="sm" dot>Wholesale Tier</Badge>
              )}
              {!inStock && (
                <Badge variant="danger" size="sm">Out of Stock</Badge>
              )}
              {isLowStock && inStock && (
                <Badge variant="warning" size="sm" dot>
                  Only {product.stock} left
                </Badge>
              )}
            </div>

            {/* Product Name */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-stone-900 tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-sm sm:text-base text-stone-600 font-normal leading-relaxed">
                {product.shortDescription}
              </p>
            )}


            {/* Rating row */}
            {product.ratings?.count > 0 && (
              <div className="flex items-center gap-3">
                <RatingStars rating={product.ratings.average} size="sm" showCount />
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="text-xs font-bold text-amber-700 hover:underline"
                >
                  {product.ratings.count} {product.ratings.count === 1 ? 'review' : 'reviews'}
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-stone-200" />

            {/* Pricing */}
            <PriceDisplay
              retailPrice={product.retailPrice}
              retailDiscountPrice={product.retailDiscountPrice}
              wholesalePrice={isWholesaleView ? product.wholesalePrice : undefined}
              b2bMoq={isWholesaleView ? product.b2bMoq : undefined}
              isWholesale={isWholesaleView}
              size="lg"
            />

            {/* B2B MOQ Notice */}
            {isWholesaleView && product.b2bMoq && (
              <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900">
                <Building2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <p>
                  <strong>Minimum Order Quantity: {product.b2bMoq} units.</strong>{' '}
                  This wholesale price applies at or above this quantity.
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-stone-200" />

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: Tag, label: 'SKU', value: product.sku },
                { icon: Weight, label: 'Weight / Unit', value: product.unit },
                {
                  icon: Package,
                  label: 'Availability',
                  value: inStock
                    ? (isLowStock ? `Low Stock (${product.stock})` : 'In Stock')
                    : 'Out of Stock',
                  highlight: !inStock
                },
                {
                  icon: Layers,
                  label: 'Category',
                  value: product.category?.name
                },
                ...(product.nutritionalInfo?.calories
                  ? [{ icon: Leaf, label: 'Calories', value: product.nutritionalInfo.calories }]
                  : [])
              ].map(({ icon: Icon, label, value, highlight }) => (
                value ? (
                  <div
                    key={label}
                    className={`p-3 rounded-2xl border ${
                      highlight ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-rose-500' : 'text-amber-600'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {label}
                      </span>
                    </div>
                    <p className={`text-xs font-bold ${highlight ? 'text-rose-700' : 'text-stone-900'}`}>
                      {value}
                    </p>
                  </div>
                ) : null
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-stone-200" />

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-500 block">
                Quantity
                {isWholesaleView && product.b2bMoq && (
                  <span className="ml-2 text-indigo-600 normal-case font-semibold">
                    (Min. {product.b2bMoq} units)
                  </span>
                )}
              </label>
              <QuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                min={isWholesaleView && product.b2bMoq ? product.b2bMoq : 1}
                max={product.stock}
                disabled={!inStock}
                isWholesale={isWholesaleView}
                moq={product.b2bMoq}
                size="lg"
              />
            </div>

            {/* Add to Cart | Buy Now | Wishlist */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                onClick={handleAddToCart}
                disabled={!inStock}
                size="lg"
                leftIcon={ShoppingBag}
                fullWidth
                className="font-black"
              >
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>

              <Button
                onClick={handleBuyNow}
                disabled={!inStock}
                variant="secondary"
                size="lg"
                leftIcon={Zap}
                fullWidth
                className="font-black"
              >
                Buy Now
              </Button>

              <WishlistButton
                isWishlisted={isWishlisted}
                onToggle={handleWishlistToggle}
                size="lg"
                className="shrink-0"
              />
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-stone-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Authentic & verified product</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Free returns within 7 days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Secure SSL payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Details Tabs Section ─── */}
        <div className="mt-14 space-y-6">
          {/* Tab Navigation */}
          <div className="border-b border-stone-200 flex gap-0 overflow-x-auto">
            {[
              { id: 'description', label: 'Description' },
              { id: 'ingredients', label: 'Ingredients & Nutrition' },
              { id: 'reviews', label: `Reviews (${product.ratings?.count || 0})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`
                  px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all focus-visible:outline-none
                  ${activeTab === tab.id
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div role="tabpanel">
            {/* Description Tab */}
            {activeTab === 'description' && (
              <div className="prose prose-stone prose-sm max-w-none leading-relaxed text-stone-700">
                <p className="whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Ingredients & Nutrition Tab */}
            {activeTab === 'ingredients' && (
              <div className="space-y-6">
                {product.ingredients?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-stone-900 mb-3 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-600" /> Ingredients
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {product.ingredients.map((ing, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-full"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.nutritionalInfo &&
                  Object.values(product.nutritionalInfo).some(Boolean) && (
                  <div>
                    <h3 className="text-sm font-black text-stone-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" /> Nutritional Information
                      <span className="text-xs font-normal text-stone-400">(per 100g)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Calories', value: product.nutritionalInfo.calories },
                        { label: 'Protein', value: product.nutritionalInfo.protein },
                        { label: 'Carbohydrates', value: product.nutritionalInfo.carbs },
                        { label: 'Total Fat', value: product.nutritionalInfo.fat }
                      ].map(({ label, value }) =>
                        value ? (
                          <div
                            key={label}
                            className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-center"
                          >
                            <p className="text-lg font-black text-stone-900">{value}</p>
                            <p className="text-[11px] text-stone-400 font-medium">{label}</p>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {(!product.ingredients?.length && !product.nutritionalInfo?.calories) && (
                  <p className="text-sm text-stone-400 italic">
                    Detailed ingredients and nutritional information will be added soon.
                  </p>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <ProductReviewsSection
                productId={product._id}
                productName={product.name}
              />
            )}
          </div>
        </div>

        {/* ─── Product Page Live Promotional Ad Placement ─── */}
        <AdPlacement placement="PRODUCT_PAGE" className="mt-10" />

        {/* ─── Related Products ─── */}
        {(relatedProducts.length > 0 || relatedLoading) && (
          <div className="mt-16 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-600 block mb-1">
                  More From {product.category?.name || 'Snackora'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  You May Also Like
                </h2>
              </div>
              <Link
                to={`/shop?category=${product.category?.slug}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 group"
              >
                View all <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <ProductGrid
              products={relatedProducts}
              loading={relatedLoading}
              skeletonCount={4}
              isWholesale={isWholesaleView}
              onAddToCart={(p, qty) => {
                addToCart(p, qty, isWholesaleView);
                success(`Added "${p.name}" to cart!`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
