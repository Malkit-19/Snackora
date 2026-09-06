import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import { socialLinks } from '../../config/socialLinks';
import PaymentBadges from './PaymentBadges';

/**
 * Reusable Global Footer with Shop, Customer, B2B, Company, Social, and Payment channels
 */
export const Footer = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid: Brand Description + 4 Categorized Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-10 pb-12 border-b border-stone-800">
          {/* Brand Col (2 cols wide on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <img
                src="/logo.png"
                alt="Snackora"
                className="w-11 h-11 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-white block leading-tight">
                  SNACKORA
                </span>

                <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">
                  Your Everyday Cravings, Delivered.
                </span>
              </div>
            </Link>


            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-sm">
              Authentic Indian super-snacks, slow-roasted makhana, rich butter cookies, clean whey protein bars, and fresh Amul dairy essentials.
            </p>

            {/* Direct Contact Snapshot */}
            <div className="space-y-2 text-xs text-stone-400 pt-2">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <a href="mailto:care@snackora.in" className="hover:text-white transition-colors">
                  care@snackora.in
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <a href="tel:+911800762256" className="hover:text-white transition-colors">
                  +91 1800-SNACKORA (Mon–Sat, 9AM–7PM)
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>Snackora Fulfillment Hub, Mumbai, Maharashtra, India</span>
              </div>
            </div>
          </div>

          {/* Column 1: SHOP */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 select-none">
              SHOP
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/products?category=cookies" className="text-stone-300 hover:text-white transition-colors">
                  Cookies
                </Link>
              </li>
              <li>
                <Link to="/products?category=protein" className="text-stone-300 hover:text-white transition-colors">
                  Protein
                </Link>
              </li>
              <li>
                <Link to="/products?category=makhana" className="text-stone-300 hover:text-white transition-colors">
                  Makhana
                </Link>
              </li>
              <li>
                <Link to="/products?category=dairy" className="text-stone-300 hover:text-white transition-colors">
                  Dairy
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-amber-300 hover:underline font-semibold text-xs pt-1 block">
                  All Products &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: CUSTOMER */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 select-none">
              CUSTOMER
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/dashboard" className="text-stone-300 hover:text-white transition-colors">
                  Account
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-stone-300 hover:text-white transition-colors">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-stone-300 hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-stone-300 hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-stone-300 hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: B2B */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 select-none">
              B2B
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/register-b2b" className="text-stone-300 hover:text-white transition-colors">
                  Become Wholesaler
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-stone-300 hover:text-white transition-colors">
                  B2B Login
                </Link>
              </li>
              <li>
                <Link to="/register-b2b" className="text-stone-300 hover:text-white transition-colors">
                  Bulk Orders
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-stone-300 hover:text-white transition-colors">
                  Wholesale Policy & MOQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: COMPANY */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 select-none">
              COMPANY
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/" className="text-stone-300 hover:text-white transition-colors">
                  About Snackora
                </Link>
              </li>
              <li>
                <a href="mailto:care@snackora.in" className="text-stone-300 hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <Link to="/privacy" className="text-stone-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-stone-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/design-system" className="text-stone-400 hover:text-stone-200 text-xs">
                  Design System Kit
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle Row: Social Links Configuration & Payment Badges */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-between pb-8 border-b border-stone-800">
          {/* Social Links */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
              Connect With Us
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.ariaLabel}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white
                    border border-stone-700/80 text-xs font-medium transition-colors
                  "
                >
                  <span>{social.name}</span>
                  <ExternalLink className="w-3 h-3 text-stone-500" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Payment Badges (COD, UPI, Cards) */}
          <div className="md:col-span-7">
            <PaymentBadges />
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 pt-2">
          <p>© {new Date().getFullYear()} SNACKORA Foods Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-stone-300 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-stone-300 transition-colors">
              Terms
            </Link>
            <Link to="/terms" className="hover:text-stone-300 transition-colors">
              Security
            </Link>
            <span className="text-stone-600">|</span>
            <span className="text-stone-400 flex items-center gap-1">
              Crafted with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for Snack Lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
