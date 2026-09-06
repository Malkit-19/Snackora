import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { Star, ShoppingBag, Filter, Sparkles } from 'lucide-react';

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';

  const { isApprovedB2B } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          catalogApi.getProducts({
            category: categoryParam || undefined,
            search: searchParam || undefined
          }),
          catalogApi.getCategories()
        ]);

        if (prodRes.success && prodRes.data?.products) {
          setProducts(prodRes.data.products);
        }
        if (catRes.success && catRes.data?.categories) {
          setCategories(catRes.data.categories);
        }
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryParam, searchParam, isApprovedB2B]);

  const handleCategorySelect = (slug) => {
    if (slug === categoryParam) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-stone-900">Snackora Catalogue</h1>
            {isApprovedB2B && (
              <Badge variant="b2b" size="sm">
                Wholesale Pricing Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-stone-500 mt-1">
            {categoryParam
              ? `Showing ${categoryParam.toUpperCase()} products`
              : 'Handcrafted cookies, clean protein fuel, Amul dairy & crunchy makhana'}
          </p>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => {
              searchParams.delete('category');
              setSearchParams(searchParams);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              !categoryParam
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Snacks
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id || cat.slug}
              onClick={() => handleCategorySelect(cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                categoryParam === cat.slug
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <LoadingSpinner text="Fetching products..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No snacks found"
          description="We couldn't find any products in this category. Try selecting another filter or searching for another flavor."
          actionText="View All Snacks"
          onAction={() => {
            searchParams.delete('category');
            searchParams.delete('search');
            setSearchParams(searchParams);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const hasWholesalePrice = product.wholesalePrice !== undefined;
            return (
              <div
                key={product._id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-amber-300 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  <img
                    src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-stone-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                      {product.unit}
                    </span>
                  </div>
                  {hasWholesalePrice && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="b2b" size="xs">
                        B2B MOQ: {product.b2bMoq}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="text-xs font-bold text-stone-700">
                        {product.ratings?.average || 4.8}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        ({product.ratings?.count || 12})
                      </span>
                    </div>
                    <h3 className="font-bold text-stone-900 text-base leading-snug group-hover:text-amber-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                      {product.shortDescription || product.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      {hasWholesalePrice ? (
                        <div>
                          <span className="text-xs text-stone-400 line-through">₹{product.retailPrice}</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-indigo-700">₹{product.wholesalePrice}</span>
                            <span className="text-[10px] uppercase font-bold text-indigo-500">Bulk Rate</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-stone-400 uppercase font-semibold">Retail Price</span>
                          <div className="text-xl font-black text-stone-900">₹{product.retailPrice}</div>
                        </div>
                      )}
                    </div>

                    <Link to={`/products/${product.slug}`}>
                      <Button size="sm" variant={hasWholesalePrice ? 'b2b' : 'primary'}>
                        <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
