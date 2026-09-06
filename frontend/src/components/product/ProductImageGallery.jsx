import React, { useState } from 'react';
import {
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

/**
 * Interactive image gallery for product detail page.
 * Shows a large primary image with thumbnail strip navigation.
 * Falls back gracefully when images are loading or missing.
 */
export const ProductImageGallery = ({ images = [], productName = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const fallbackImg =
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80';

  const displayImages = images.length > 0
    ? images
    : [{ url: fallbackImg, alt: productName }];

  const activeImage = displayImages[activeIndex] || displayImages[0];

  const prev = () =>
    setActiveIndex((i) => (i - 1 + displayImages.length) % displayImages.length);
  const next = () =>
    setActiveIndex((i) => (i + 1) % displayImages.length);

  return (
    <>
      {/* Main image with prev/next and zoom trigger */}
      <div className="space-y-3">
        <div className="relative group aspect-square rounded-3xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-sm">
          <img
            src={activeImage.url}
            alt={activeImage.alt || productName}
            onError={(e) => { e.currentTarget.src = fallbackImg; }}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />

          {/* Zoom trigger (desktop) */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Zoom image"
            className="
              absolute top-3 right-3 p-2 rounded-xl bg-white/90 text-stone-600
              hover:bg-white hover:text-stone-900 shadow-sm transition-all
              opacity-0 group-hover:opacity-100
            "
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Prev / Next arrows for multi-image */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="
                  absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl
                  bg-white/90 text-stone-700 shadow-sm hover:bg-white transition-all
                "
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="
                  absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl
                  bg-white/90 text-stone-700 shadow-sm hover:bg-white transition-all
                "
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Image counter pill */}
          {displayImages.length > 1 && (
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-stone-900/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              {activeIndex + 1} / {displayImages.length}
            </span>
          )}
        </div>

        {/* Thumbnail strip */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {displayImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`View image ${idx + 1}`}
                className={`
                  shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all
                  ${activeIndex === idx
                    ? 'border-amber-500 shadow-md shadow-amber-500/20'
                    : 'border-stone-200 hover:border-amber-300 opacity-70 hover:opacity-100'
                  }
                `}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${idx + 1}`}
                  onError={(e) => { e.currentTarget.src = fallbackImg; }}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom view"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close zoom view"
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6 rotate-[-90deg]" />
          </button>
          <img
            src={activeImage.url}
            alt={activeImage.alt || productName}
            className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ProductImageGallery;
