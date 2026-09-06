import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Package,
  MapPin,
  LogOut,
  ShieldCheck,
  Building2,
  ChevronDown,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Role-aware account dropdown supporting Customer, B2B Wholesaler, and Admin
 */
export const NavAccountDropdown = ({
  user,
  role,
  isApprovedB2B,
  isPendingB2B,
  isAdmin,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // If user is logged out, render Login / Sign Up actions
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="font-bold">
            Sign In
          </Button>
        </Link>
        <Link to="/register">
          <Button size="sm" className="shadow-sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  // Logged in: Avatar Trigger + Role-aware dropdown
  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User Account Menu"
        className="
          flex items-center gap-2.5 p-1.5 pl-3 rounded-full border border-stone-200
          hover:border-amber-400 bg-stone-50/80 hover:bg-stone-100/60
          transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        "
      >
        <div className="text-left hidden lg:block">
          <p className="text-xs font-bold text-stone-800 leading-tight max-w-[110px] truncate">
            {user.name}
          </p>
          <p className="text-[10px] text-stone-500 uppercase font-semibold">
            {isAdmin ? 'Admin' : role === 'B2B_WHOLESALER' ? 'Wholesale' : 'Customer'}
          </p>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
          {initials}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="menu"
          className="
            absolute right-0 mt-2 w-64 bg-white rounded-3xl border border-stone-200/90
            shadow-2xl py-2 z-50 transform transition-all animate-in fade-in zoom-in-95 duration-150
            focus:outline-none overflow-hidden
          "
        >
          {/* User Info Header */}
          <div className="px-5 py-3 border-b border-stone-100 bg-stone-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Signed In
              </span>
              {isAdmin && <Badge variant="admin" size="xs">Admin</Badge>}
              {isApprovedB2B && <Badge variant="b2b" size="xs" dot>Wholesale</Badge>}
              {isPendingB2B && <Badge variant="warning" size="xs" dot>Under Review</Badge>}
            </div>
            <p className="text-sm font-bold text-stone-900 truncate">{user.name}</p>
            <p className="text-xs text-stone-500 truncate">{user.email}</p>

            {role === 'B2B_WHOLESALER' && user.b2bProfile?.companyName && (
              <p className="text-xs font-semibold text-indigo-700 mt-1 truncate">
                {user.b2bProfile.companyName}
              </p>
            )}
          </div>

          <div className="py-1">
            {/* 1. Admin Dashboard (if Admin) */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            {/* 2. B2B Dashboard (if B2B Wholesaler) */}
            {role === 'B2B_WHOLESALER' && (
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>B2B Dashboard</span>
              </Link>
            )}

            {/* 3. Account Dashboard */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-50/80 hover:text-amber-800 transition-colors"
            >
              <User className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Account Profile</span>
            </Link>

            {/* 4. Orders */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-50/80 hover:text-amber-800 transition-colors"
            >
              <Package className="w-4 h-4 text-stone-400 shrink-0" />
              <span>My Orders</span>
            </Link>

            {/* 5. Addresses */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-amber-50/80 hover:text-amber-800 transition-colors"
            >
              <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
              <span>Saved Addresses</span>
            </Link>
          </div>

          {/* Divider & Sign Out */}
          <div className="pt-1 mt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              role="menuitem"
              className="w-full flex items-center gap-3 px-5 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavAccountDropdown;
