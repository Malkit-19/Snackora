import React from 'react';
import { Award, ShieldCheck, Truck, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';

export const WhySnackoraSection = () => {
  const pillars = [
    {
      id: 'quality',
      icon: Award,
      title: 'Real Ingredients',
      subtitle: 'Pure butter & honest recipes',
      description: 'Slow-roasted makhana, dark chocolate cookies, and fresh Amul dairy.'
    },
    {
      id: 'payments',
      icon: ShieldCheck,
      title: 'Easy Payments',
      subtitle: 'UPI, Cards & Cash on Delivery',
      description: 'Pay quickly with GPay, PhonePe, Cards, or Cash on Delivery at your door.'
    },
    {
      id: 'delivery',
      icon: Truck,
      title: 'Fast Delivery',
      subtitle: 'Packed fresh & safe',
      description: 'Quick dispatch across India so your snacks always arrive crisp and fresh.'
    },
    {
      id: 'b2b',
      icon: Building2,
      title: 'Buy in Bulk',
      subtitle: 'Better prices for bigger orders',
      description: 'Special wholesale rates and GST invoices for stores and offices.'
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 block mb-1">
          Good Food Promise
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Good snacks. Good mood.
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mt-2">
          Made fresh for your everyday snack breaks and family cravings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card
              key={pillar.id}
              hoverable
              className="p-6 text-left flex flex-col justify-between group rounded-3xl"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-600 text-amber-700 group-hover:text-white flex items-center justify-center transition-colors duration-200 mb-4 shadow-xs">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-stone-900 tracking-tight group-hover:text-amber-700 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs font-bold text-amber-700 mt-0.5 mb-2">
                  {pillar.subtitle}
                </p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default WhySnackoraSection;
