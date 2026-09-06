import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marketingApi } from '../../api/marketingApi';
import { Megaphone, ArrowRight } from 'lucide-react';

export const AdPlacement = ({ placement = 'HOMEPAGE', className = '' }) => {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    marketingApi.getActiveAds(placement)
      .then((res) => {
        if (res.success && res.data?.ads) {
          setAds(res.data.ads);
        }
      })
      .catch(() => {});
  }, [placement]);

  if (!ads || ads.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {ads.map((ad) => (
        <div
          key={ad._id}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-900 to-amber-700 text-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        >
          {ad.image && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="relative z-10 space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider">
              <Megaphone className="w-3.5 h-3.5 text-amber-300" />
              <span>Special Offer</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">{ad.title}</h3>
            {ad.description && (
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed font-medium">{ad.description}</p>
            )}
          </div>

          <div className="relative z-10 shrink-0">
            <Link
              to={ad.link || '/shop'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs sm:text-sm transition-transform hover:scale-105 active:scale-95 shadow-md shadow-amber-950/30"
            >
              Explore Deal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdPlacement;
