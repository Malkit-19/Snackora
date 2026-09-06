import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export const B2BCalloutSection = () => {
  const perks = [
    'Direct wholesale pricing',
    'GST tax invoices included',
    'Low minimum order quantities',
    'Reliable pan-India delivery'
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      <div className="relative rounded-3xl bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 text-white p-8 sm:p-12 lg:p-14 overflow-hidden shadow-xl border border-stone-800">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left copy */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Wholesale &amp; Bulk</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Buy in Bulk for Your Business
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl">
              Stocking up for your retail shop, supermarket, cafe, or office pantry? Partner with us for special bulk prices and reliable supply.
            </p>

            {/* Perks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-stone-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link to="/register-b2b">
                <Button
                  size="md"
                  variant="b2b"
                  className="bg-white text-indigo-950 hover:bg-stone-100 font-bold text-xs sm:text-sm px-6 py-3"
                  rightIcon={ArrowRight}
                >
                  Apply for Wholesale
                </Button>
              </Link>

              <Link to="/login">
                <Button
                  size="md"
                  variant="outline"
                  className="border-indigo-400/50 text-indigo-200 hover:bg-indigo-950/60 font-bold text-xs sm:text-sm px-5 py-3"
                >
                  Wholesale Login
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Card */}
          <div className="lg:col-span-5">
            <div className="bg-stone-900/80 border border-stone-700/80 rounded-3xl p-6 backdrop-blur-md shadow-lg space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Verified Wholesale Account</h4>
                  <p className="text-[11px] text-stone-400">Quick 24-hour verification</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700/50">
                  <p className="text-xl font-black text-amber-400">Up to 40%</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Bulk Margin</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700/50">
                  <p className="text-xl font-black text-indigo-400">GST Input</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Tax Invoices</p>
                </div>
              </div>

              <p className="text-xs text-stone-400 leading-relaxed">
                Simple onboarding with dedicated support for regular replenishment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default B2BCalloutSection;
