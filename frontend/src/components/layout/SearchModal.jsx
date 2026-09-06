import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, ArrowRight, Sparkles, TrendingUp, Package } from 'lucide-react';
import { catalogApi } from '../../api/catalogApi';

/**
 * Interactive Search Modal with auto-focus, recent searches history,
 * trending pills, and debounced live backend API preview.
 */
export const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Trending search suggestions
  const trendingSearches = [
    'Classic Cookies',
    'Peri Peri Makhana',
    'Amul Butter',
    'Protein Bar',
    'Cream & Onion',
    'High-Protein Cookie'
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snackora_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

  // Focus input on open & lock background scroll
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Debounced live search preview via backend API
  useEffect(() => {
    if (!query.trim()) {
      setLiveResults([]);
      setLoadingResults(false);
      return;
    }

    setLoadingResults(true);
    const handler = setTimeout(async () => {
      try {
        const res = await catalogApi.getProducts({ search: query.trim(), limit: 5 });
        if (res.success && res.data?.products) {
          setLiveResults(res.data.products);
        } else {
          setLiveResults([]);
        }
      } catch (e) {
        console.error('Search preview failed:', e);
        setLiveResults([]);
      } finally {
        setLoadingResults(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim();
    const updated = [cleanTerm, ...recentSearches.filter((s) => s.toLowerCase() !== cleanTerm.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('snackora_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent search:', e);
    }
  };

  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== termToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem('snackora_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update recent searches:', e);
    }
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('snackora_recent_searches');
  };

  const handleSubmitSearch = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    saveRecentSearch(query);
    onClose();
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectRecent = (term) => {
    setQuery(term);
    saveRecentSearch(term);
    onClose();
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleSelectProduct = (product) => {
    saveRecentSearch(product.name);
    onClose();
    navigate(`/products/${product.slug}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Search Snackora Catalogue"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Header / Input Field */}
        <form onSubmit={handleSubmitSearch} className="relative flex items-center border-b border-stone-100 px-4 sm:px-6 py-4">
          <Search className="w-5 h-5 text-stone-400 shrink-0 mr-3" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cookies, protein bars, Amul milk, peri peri makhana..."
            className="w-full bg-transparent text-stone-900 placeholder:text-stone-400 text-base sm:text-lg font-medium focus:outline-none"
            aria-label="Search input"
          />

          {/* Clear button or shortcut badge */}
          <div className="flex items-center gap-2 ml-2">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search text"
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-block text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 uppercase">
                ESC to close
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close search modal"
              className="sm:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {/* 1. Live results view while typing */}
          {query.trim() && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Matching Products {loadingResults && '...'}
                </span>
                {liveResults.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSubmitSearch}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    View all matching results <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {loadingResults ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-2xl animate-pulse bg-stone-50">
                      <div className="w-12 h-12 rounded-xl bg-stone-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-1/2 h-3.5 bg-stone-200 rounded" />
                        <div className="w-1/4 h-3 bg-stone-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : liveResults.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {liveResults.map((prod) => (
                    <div
                      key={prod._id}
                      onClick={() => handleSelectProduct(prod)}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-amber-50/60 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=120&q=80'}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-stone-900 group-hover:text-amber-800 truncate">
                            {prod.name}
                          </p>
                          <p className="text-xs text-stone-400">
                            {prod.category?.name || 'Snacks'} • {prod.unit || 'Standard'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-3 shrink-0">
                        <span className="text-sm font-black text-stone-900">₹{prod.retailPrice}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-stone-400 text-sm">
                  <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  No direct matches found for "{query}". Press Enter to search entire store.
                </div>
              )}
            </div>
          )}

          {/* 2. Recent Searches (shown when no query or alongside) */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearAllRecentSearches}
                  className="text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    onClick={() => handleSelectRecent(term)}
                    className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(e, term)}
                      aria-label={`Remove recent search ${term}`}
                      className="text-stone-400 group-hover:text-stone-600 hover:text-rose-600 p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Trending Searches (shown when no query) */}
          {!query.trim() && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                Popular & Trending Searches
              </span>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSelectRecent(term)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-800 border border-stone-200 hover:border-amber-300 text-xs font-medium transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
          <span>Search Snackora’s fresh inventory in real time</span>
          <button
            type="button"
            onClick={handleSubmitSearch}
            className="font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            Search All &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
