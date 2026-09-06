import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { heroSlides } from '../../config/heroSlides';
import { marketingApi } from '../../api/marketingApi';

/**
 * Large responsive Hero Slideshow with auto-slide, pause-on-hover,
 * touch/swipe gestures, and accessible keyboard navigation.
 */
export const HeroSlideshow = ({ slides: initialSlides = heroSlides, autoSlideInterval = 5000 }) => {
  const [slides, setSlides] = useState(initialSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Fetch real-time active banners from backend
  useEffect(() => {
    marketingApi.getActiveBanners()
      .then((res) => {
        if (res.success && res.data?.banners && res.data.banners.length > 0) {
          const mapped = res.data.banners.map((b, idx) => ({
            id: b._id || `banner_${idx}`,
            heading: b.title,
            subtitle: b.subtitle || b.description || 'Gourmet handcrafted snacks made fresh.',
            tagline: b.tagline || 'Special Selection',
            ctaText: b.ctaText || 'SHOP NOW',
            link: b.ctaUrl || b.link || '/shop',
            image: {
              url: b.image || b.imageUrl,
              alt: b.title,
              fallback: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=1200&auto=format&fit=crop'
            }
          }));
          setSlides(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const containerRef = useRef(null);
  const slideCount = slides.length;


  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Auto-slide effect (pauses on hover)
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [isPaused, slideCount, autoSlideInterval, nextSlide]);

  // Touch / Swipe handlers for mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Keyboard navigation (Left / Right arrow keys)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Snackora Featured Collections"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative w-full overflow-hidden bg-stone-950 text-white select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {/* Slides Container */}
      <div className="relative min-h-[440px] sm:min-h-[500px] md:min-h-[560px] lg:min-h-[620px] flex items-center">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slideCount}: ${slide.heading}`}
              aria-hidden={!isActive}
              className={`
                absolute inset-0 transition-opacity duration-700 ease-in-out
                ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}
              `}
            >
              {/* Background Image with Gradient Overlay */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={slide.image?.url}
                  alt={slide.image?.alt || slide.heading}
                  onError={(e) => {
                    if (slide.image?.fallback) {
                      e.currentTarget.src = slide.image.fallback;
                    }
                  }}
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
                />
                {/* Multi-layered dark gradient for high readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/70 to-stone-950/30 sm:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/30" />
              </div>

              {/* Slide Content Layer */}
              <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                <div className="max-w-xl py-16 sm:py-20 space-y-4 sm:space-y-6">
                  {/* Tagline Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>{slide.tagline}</span>
                  </div>

                  {/* Heading */}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
                    {slide.heading}
                  </h1>


                  {/* Subtitle */}
                  <p className="text-sm sm:text-base lg:text-lg text-stone-200 leading-relaxed max-w-lg font-normal">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  <div className="pt-2 sm:pt-4">
                    <Link to={slide.link || '/products'}>
                      <Button
                        size="lg"
                        rightIcon={ArrowRight}
                        className="shadow-xl shadow-amber-600/30 hover:scale-105 active:scale-95 text-base px-8 py-4 font-black"
                      >
                        {slide.ctaText || 'SHOP NOW'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls: Previous / Next Chevrons (Desktop & Tablet) */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous slide"
        className="
          hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20
          w-11 h-11 rounded-full items-center justify-center
          bg-stone-900/60 hover:bg-stone-900/90 text-white border border-white/20
          backdrop-blur-md transition-all hover:scale-110 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        "
      >
        <ChevronLeft className="w-6 h-6" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next slide"
        className="
          hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20
          w-11 h-11 rounded-full items-center justify-center
          bg-stone-900/60 hover:bg-stone-900/90 text-white border border-white/20
          backdrop-blur-md transition-all hover:scale-110 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
        "
      >
        <ChevronRight className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Pagination Dot Indicators */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2.5">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}: ${slide.heading}`}
              aria-current={isActive ? 'true' : 'false'}
              className={`
                h-2.5 rounded-full transition-all duration-300
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                ${isActive
                  ? 'w-8 bg-amber-500 shadow-sm shadow-amber-500/50'
                  : 'w-2.5 bg-white/40 hover:bg-white/70'
                }
              `}
            />
          );
        })}
      </div>
    </section>
  );
};

export default HeroSlideshow;
