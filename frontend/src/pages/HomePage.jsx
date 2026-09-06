import React from 'react';
import {
  HeroSlideshow,
  CategorySection,
  FeaturedProductsSection,
  WhySnackoraSection,
  B2BCalloutSection,
  NewsletterSection
} from '../components/home';
import SEO, { buildOrganizationLD } from '../components/common/SEO';
import { AdPlacement } from '../components/common/AdPlacement';

/**
 * Premium Snackora Homepage
 */
export const HomePage = () => {
  return (
    <div className="space-y-4 sm:space-y-8 pb-12 overflow-x-hidden">
      <SEO
        title="Premium Handcrafted Snacks — Makhana, Chips, Cookies, Nuts"
        description="Shop premium handcrafted snacks online — Roasted Makhana, Gourmet Chips, Butter Cookies, Healthy Nuts. Fast delivery across India. Wholesale B2B available."
        url="https://www.snackora.in/"
        type="website"
        structuredData={buildOrganizationLD()}
      />

      {/* 1. Large Responsive Hero Slideshow */}
      <HeroSlideshow />

      {/* 1.5. Live Promotional Ads Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdPlacement placement="HOMEPAGE" />
      </div>

      {/* 2. Category Cards Section (Cookies, Protein, Makhana, Dairy) */}
      <CategorySection />


      {/* 3. Featured Products Grid (Live API with dual-pricing) */}
      <FeaturedProductsSection />

      {/* 4. Why Snackora 4 Pillars (Quality, Security, Delivery, B2B) */}
      <WhySnackoraSection />

      {/* 5. Prominent B2B Call-to-Action Banner */}
      <B2BCalloutSection />

      {/* 6. Newsletter Subscription */}
      <NewsletterSection />
    </div>
  );
};

export default HomePage;
