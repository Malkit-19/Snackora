import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import SearchModal from './SearchModal';
import NavAccountDropdown from './NavAccountDropdown';
import NavMobileDrawer from './NavMobileDrawer';
import NotificationDropdown from '../common/NotificationDropdown';
import {
  ShoppingBag,
  Search,
  Building2,
  ShieldCheck,
  Menu,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

/**
 * Snackora Global Sticky Navigation Bar
 */
export const Navbar = () => {
  const { user, role, isApprovedB2B, isPendingB2B, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Global hotkey to open Search Modal ('/' or 'Ctrl+K')
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't trigger if user is actively typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        return;
      }

      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs transition-shadow">
        {/* Top Micro-Bar for B2B status & assurance */}
        <div className="bg-stone-900 text-stone-300 text-xs sm:text-sm py-2 px-4 font-medium select-none">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Direct from Source • Pure Butter, Roasted Makhana & Amul Dairy</span>
            </div>

            <div className="flex items-center gap-4">
              {!user && (
                <Link
                  to="/register-b2b"
                  className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Wholesale B2B Portal</span>
                </Link>
              )}

              {isApprovedB2B && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Wholesale Pricing Active
                </span>
              )}

              {isPendingB2B && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Wholesale Application Under Review
                </span>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Main Navbar Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* 1. Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <img
                src="/logo.png"
                alt="Snackora Logo"
                className="w-12 h-12 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 group-hover:text-amber-700 transition-colors">
                    SNACKORA
                  </span>

                  {isApprovedB2B && (
                    <Badge variant="b2b" size="sm">
                      B2B Partner
                    </Badge>
                  )}
                  {isAdmin && (
                    <Badge variant="admin" size="sm">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </Link>

            {/* 2. Desktop Navigation Menu */}
            <nav
              role="navigation"
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-8 text-base font-semibold text-stone-700"
            >
              {/* Home */}
              <Link
                to="/"
                className={`transition-colors hover:text-amber-600 ${
                  isActive('/') ? 'text-amber-700' : ''
                }`}
              >
                Home
              </Link>


              {/* Shop Now */}
              <Link
                to="/shop"
                className={`transition-colors hover:text-amber-600 ${
                  isActive('/shop') || isActive('/products') ? 'text-amber-700' : ''
                }`}
              >
                Shop Now
              </Link>

              {/* Search Trigger Button */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Open search dialog"
                className="
                  flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100/80
                  hover:bg-amber-50/80 border border-stone-200 hover:border-amber-300
                  text-stone-600 hover:text-amber-900 transition-all font-semibold text-xs
                "
              >
                <Search className="w-3.5 h-3.5 text-stone-400" />
                <span>Search</span>
                <kbd className="text-[10px] bg-white text-stone-400 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
                  /
                </kbd>
              </button>

              {/* B2B Link */}
              <Link
                to={role === 'B2B_WHOLESALER' ? '/dashboard' : '/register-b2b'}
                className={`flex items-center gap-1.5 transition-colors ${
                  isApprovedB2B
                    ? 'text-indigo-700 hover:text-indigo-800'
                    : 'text-stone-700 hover:text-amber-600'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>B2B Wholesale</span>
              </Link>
            </nav>

            {/* 3. Right Action Controls: Cart, Account, Mobile Hamburger */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Search Icon (Visible on small screens) */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Open search dialog"
                className="md:hidden p-2 rounded-xl text-stone-600 hover:text-amber-700 hover:bg-stone-100 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Cart Button with Real-time Item Counter */}
              <Link
                to="/cart"
                aria-label={`Shopping cart with ${cartCount} items`}
                className="
                  relative p-2.5 rounded-2xl text-stone-700 hover:text-amber-700
                  hover:bg-amber-50/80 border border-stone-200/80 hover:border-amber-300
                  transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                "
              >
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                {cartCount > 0 && (
                  <span
                    className="
                      absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5
                      bg-amber-600 text-white rounded-full text-[10px] font-black
                      flex items-center justify-center shadow-sm animate-in zoom-in-50 duration-150
                    "
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Notification Dropdown */}
              <NotificationDropdown />

              {/* Account Dropdown (Desktop) */}
              <div className="hidden sm:block">
                <NavAccountDropdown
                  user={user}
                  role={role}
                  isApprovedB2B={isApprovedB2B}
                  isPendingB2B={isPendingB2B}
                  isAdmin={isAdmin}
                  onLogout={handleLogout}
                />
              </div>

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileDrawerOpen}
                className="
                  md:hidden p-2 rounded-2xl text-stone-700 hover:text-amber-700
                  hover:bg-stone-100 border border-stone-200 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                "
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Interactive Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Mobile Slide-Over Navigation Drawer */}
      <NavMobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        user={user}
        role={role}
        isApprovedB2B={isApprovedB2B}
        isPendingB2B={isPendingB2B}
        isAdmin={isAdmin}
        onOpenSearch={() => setSearchModalOpen(true)}
        cartCount={cartCount}
        onLogout={handleLogout}
      />
    </>
  );
};

export default Navbar;
