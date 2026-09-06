import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalogApi';
import { ArrowRight, Cookie, Dumbbell, Milk, Flame } from 'lucide-react';

export const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultCategories = [
    {
      _id: 'cat-cookies',
      slug: 'cookies',
      name: 'Cookies',
      tagline: 'Fresh Bakes',
      description: 'Rich butter and dark chocolate cookies baked fresh.',
      image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
      icon: Cookie
    },
    {
      _id: 'cat-protein',
      slug: 'protein',
      name: 'Protein Bars',
      tagline: 'Quick Energy',
      description: 'Tasty protein bars and bites for when you need a boost.',
      image: 'https://images.unsplash.com/photo-1622484216850-8b17b2b73bc3?auto=format&fit=crop&w=600&q=80',
      icon: Dumbbell
    },
    {
      _id: 'cat-makhana',
      slug: 'makhana',
      name: 'Makhana',
      tagline: 'Roasted',
      description: 'Crunchy roasted makhana tossed in tasty spices.',
      image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80',
      icon: Flame
    },
    {
      _id: 'cat-dairy',
      slug: 'dairy',
      name: 'Amul Dairy',
      tagline: 'Fresh Dairy',
      description: 'Pure milk, table butter, and cheese for your pantry.',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      icon: Milk
    }
  ];

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await catalogApi.getCategories();
        if (res.success && res.data?.categories?.length > 0) {
          const merged = res.data.categories.map((cat) => {
            const match = defaultCategories.find((d) => d.slug === cat.slug);
            return {
              ...match,
              ...cat,
              image: cat.image || match?.image
            };
          });
          setCategories(merged);
        } else {
          setCategories(defaultCategories);
        }
      } catch {
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1 block">
            Snack Time
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Shop by Category
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

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon || Cookie;

          return (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              className="group relative rounded-3xl overflow-hidden bg-white border border-stone-200 shadow-xs hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />

                {/* Category Icon */}
                <div className="absolute top-3 left-3 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md text-amber-700 flex items-center justify-center shadow-xs">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>

                {/* Text inside image */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-300 block">
                    {cat.tagline || 'Snacks'}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight leading-tight">
                    {cat.name}
                  </h3>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>

                <div className="flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800 pt-2 border-t border-stone-100">
                  <span>Explore {cat.name}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CategorySection;
