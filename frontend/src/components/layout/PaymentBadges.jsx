import React from 'react';
import { Banknote, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';

/**
 * Visual indicators for supported payment channels: COD, UPI, and Cards
 */
export const PaymentBadges = ({ className = '', compact = false }) => {
  const methods = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      short: 'COD Available',
      icon: Banknote,
      subtext: 'Pay at your doorstep'
    },
    {
      id: 'upi',
      name: 'UPI Instant Pay',
      short: 'GPay • PhonePe • Paytm',
      icon: Smartphone,
      subtext: '0% extra transaction fee'
    },
    {
      id: 'cards',
      name: 'Cards & NetBanking',
      short: 'Visa • Mastercard • RuPay',
      icon: CreditCard,
      subtext: '256-bit SSL encrypted'
    }
  ];

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 text-xs font-medium select-none"
            >
              <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{method.short}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        <span>Safe & Encrypted Payments</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/80 text-left select-none hover:border-stone-600 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-700 text-amber-400 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-200 truncate">{method.name}</p>
                <p className="text-[10px] text-stone-400 truncate">{method.short}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentBadges;
