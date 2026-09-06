import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Search,
  ShoppingBag,
  User,
  Building2,
  ShieldCheck,
  Package,
  MapPin,
  LogOut,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Accessible mobile slide-over navigation drawer
 */
export const NavMobileDrawer = ({
  isOpen,
  onClose,
  user,
  role,
  isApprovedB2B,
  isPendingB2B,
  isAdmin,
  onOpenSearch,
  cartCount = 0,
  onLogout
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Snackora"
              className="w-10 h-10 rounded-xl object-cover shadow-xs"
            />
            <div>
              <span className="font-extrabold tracking-tight text-lg text-stone-900 block leading-tight">
                SNACKORA
              </span>

              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                Everyday Cravings
              </span>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close mobile menu"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Links */}
        <div className="p-5 space-y-6 flex-1">
          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 hover:bg-amber-50/70 border border-stone-200 text-stone-600 hover:text-amber-800 text-xs sm:text-sm font-semibold transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-stone-400" />
              <span>Search snacks & dairy...</span>
            </div>
            <kbd className="text-[10px] bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-400 font-mono">
              /
            </kbd>
          </button>

          {/* Core Navigation Links */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 mb-1">
              Explore Store
            </p>
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-stone-800 hover:bg-amber-50 hover:text-amber-700 text-sm transition-colors"
            >
              <span>Home</span>
            </Link>
            <Link
              to="/products"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-stone-800 hover:bg-amber-50 hover:text-amber-700 text-sm transition-colors"
            >
              <span>Shop Now</span>
              <ArrowRight className="w-4 h-4 text-stone-400" />
            </Link>
            <Link
              to="/register-b2b"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-indigo-700 hover:bg-indigo-50 text-sm transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>B2B Wholesale</span>
              </div>
              <Badge variant="b2b" size="xs">Bulk Rates</Badge>
            </Link>
            <Link
              to="/design-system"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-amber-800 hover:bg-amber-50 text-sm transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Design System</span>
              </div>
              <Badge variant="primary" size="xs">UI Kit</Badge>
            </Link>
          </div>

          {/* Categories Grid */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3">
              Categories
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/products?category=cookies"
                onClick={onClose}
                className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 text-stone-800 hover:text-amber-900 font-bold text-xs transition-colors text-center"
              >
                Cookies
              </Link>
              <Link
                to="/products?category=protein"
                onClick={onClose}
                className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 text-stone-800 hover:text-amber-900 font-bold text-xs transition-colors text-center"
              >
                Protein
              </Link>
              <Link
                to="/products?category=dairy"
                onClick={onClose}
                className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 text-stone-800 hover:text-amber-900 font-bold text-xs transition-colors text-center"
              >
                Amul Dairy
              </Link>
              <Link
                to="/products?category=makhana"
                onClick={onClose}
                className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 text-stone-800 hover:text-amber-900 font-bold text-xs transition-colors text-center"
              >
                Makhana
              </Link>
            </div>
          </div>

          {/* User Account / Role Section */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3">
              My Account
            </p>

            {user ? (
              <div className="space-y-1">
                <div className="p-3 rounded-xl bg-stone-50 mb-2">
                  <p className="text-xs font-bold text-stone-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isAdmin && <Badge variant="admin" size="xs">Admin</Badge>}
                    {isApprovedB2B && <Badge variant="b2b" size="xs">Wholesale Partner</Badge>}
                    {isPendingB2B && <Badge variant="warning" size="xs">Under Review</Badge>}
                  </div>
                </div>

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                {role === 'B2B_WHOLESALER' && (
                  <Link
                    to="/dashboard"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>B2B Dashboard</span>
                  </Link>
                )}

                <Link
                  to="/dashboard"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  <span>Account Profile</span>
                </Link>

                <Link
                  to="/dashboard"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4 text-stone-400" />
                  <span>My Orders</span>
                </Link>

                <Link
                  to="/dashboard"
                  onClick={onClose}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <MapPin className="w-4 h-4 text-stone-400" />
                  <span>Saved Addresses</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link to="/login" onClick={onClose}>
                  <Button variant="secondary" size="sm" fullWidth>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={onClose}>
                  <Button size="sm" fullWidth>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Cart Action */}
        <div className="p-5 border-t border-stone-100 bg-stone-50">
          <Link
            to="/cart"
            onClick={onClose}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Review Cart</span>
            </div>
            <span className="bg-amber-800 text-white px-2 py-0.5 rounded-full text-xs font-black">
              {cartCount} items
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NavMobileDrawer;
