/**
 * Snackora Homepage Hero Slideshow Configuration
 */
export const heroSlides = [
  {
    id: 'slide-1',
    tagline: 'Freshly Baked',
    heading: 'Better snacks. Made to crave.',
    subtitle: 'Crunchy roasted makhana, rich dark chocolate cookies, and daily essentials delivered fresh to your door.',
    ctaText: 'Shop Now',
    link: '/shop',
    theme: 'amber',
    image: {
      url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1600&q=80',
      alt: 'Artisanal Dark Chocolate Cookies with melting chocolate chips',
      fallback: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1600&q=80'
    }
  },
  {
    id: 'slide-2',
    tagline: 'Light & Crunchy',
    heading: 'Roasted Makhana',
    subtitle: 'Slow-roasted in olive oil with spicy peri peri, cream & onion, and classic sea salt.',
    ctaText: 'Explore Snacks',
    link: '/products?category=makhana',
    theme: 'rose',
    image: {
      url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=1600&q=80',
      alt: 'Slow-roasted spicy and salted Makhana foxnuts',
      fallback: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=1600&q=80'
    }
  },
  {
    id: 'slide-3',
    tagline: 'Energy Boost',
    heading: 'Protein Bars & Bites',
    subtitle: 'Delicious snack bars with 20g protein and zero refined sugar for quick energy.',
    ctaText: 'Shop Protein',
    link: '/products?category=protein',
    theme: 'emerald',
    image: {
      url: 'https://images.unsplash.com/photo-1622484216850-8b17b2b73bc3?auto=format&fit=crop&w=1600&q=80',
      alt: 'High-protein peanut butter and chocolate energy bar',
      fallback: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?auto=format&fit=crop&w=1600&q=80'
    }
  },
  {
    id: 'slide-4',
    tagline: 'Daily Essentials',
    heading: 'Fresh Amul Dairy',
    subtitle: 'Pure milk, butter, and cheese delivered straight to your home.',
    ctaText: 'Shop Dairy',
    link: '/products?category=dairy',
    theme: 'sky',
    image: {
      url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1600&q=80',
      alt: 'Fresh pure dairy milk and butter in glass containers',
      fallback: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=1600&q=80'
    }
  }
];

export default heroSlides;
