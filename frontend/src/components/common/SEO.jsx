/**
 * Snackora SEO Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets <title>, <meta name="description">, Open Graph, Twitter Card, and
 * canonical tags on any page. Uses document.head manipulation directly since
 * we are in a client-side Vite / SPA environment without react-helmet-async.
 *
 * Usage:
 *   <SEO
 *     title="Peri Peri Makhana — Snackora"
 *     description="Light, crunchy peri peri makhana roasted to perfection..."
 *     image="https://res.cloudinary.com/.../product.jpg"
 *     url="https://www.snackora.in/products/peri-peri-makhana"
 *     type="product"    // "website" | "product" | "article"
 *     structuredData={...} // JSON-LD object (optional)
 *   />
 */

import { useEffect } from 'react';

const SITE_NAME  = 'Snackora';
const SITE_URL   = 'https://www.snackora.in';
const DEFAULT_DESC = 'Premium handcrafted snacks — Makhana, Gourmet Chips, Butter Cookies, Healthy Nuts. Shop online, fast delivery across India.';
const DEFAULT_IMG = `${SITE_URL}/og-image.jpg`; // 1200×630 OG image in /public

/**
 * Set or create a <meta> tag in document.head.
 */
function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Set or create a <link> tag in document.head.
 */
function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Set or update the JSON-LD structured data script.
 */
function setStructuredData(data) {
  const id = 'snackora-json-ld';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeStructuredData() {
  const el = document.getElementById('snackora-json-ld');
  if (el) el.remove();
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMG,
  url,
  type = 'website',
  structuredData = null,
  noIndex = false
}) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Premium Handcrafted Snacks`;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);

  useEffect(() => {
    // ── Page Title ──────────────────────────────────────────────────────────
    document.title = fullTitle;

    // ── Standard Meta ───────────────────────────────────────────────────────
    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // ── Open Graph ──────────────────────────────────────────────────────────
    setMeta('og:type',        type === 'product' ? 'product' : type === 'article' ? 'article' : 'website', 'property');
    setMeta('og:title',       fullTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image',       image, 'property');
    setMeta('og:url',         canonicalUrl, 'property');
    setMeta('og:site_name',   SITE_NAME, 'property');
    setMeta('og:locale',      'en_IN', 'property');

    // ── Twitter Card ────────────────────────────────────────────────────────
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image',       image);

    // ── Canonical ───────────────────────────────────────────────────────────
    setLink('canonical', canonicalUrl);

    // ── JSON-LD Structured Data ──────────────────────────────────────────────
    if (structuredData) {
      setStructuredData(structuredData);
    } else {
      removeStructuredData();
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      // Restore defaults on unmount so stale meta doesn't persist
      document.title = `${SITE_NAME} — Premium Handcrafted Snacks`;
      setMeta('robots', 'index, follow');
      removeStructuredData();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, description, image, canonicalUrl, noIndex]);

  return null; // Renders nothing to the DOM
}

/**
 * ── JSON-LD Builder Helpers ──────────────────────────────────────────────────
 * Pre-built Schema.org structures for common Snackora page types.
 */

export function buildProductLD(product, reviewCount, avgRating) {
  const imageUrl =
    (Array.isArray(product.images) && product.images.length > 0)
      ? (product.images.find(i => i.isPrimary)?.url || product.images[0]?.url)
      : DEFAULT_IMG;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: imageUrl,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.retailPrice ?? product.mrp,
      availability: product.isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.slug}`,
      seller: {
        '@type': 'Organization',
        name: SITE_NAME
      }
    }
  };

  if (avgRating && reviewCount) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(avgRating),
      reviewCount: String(reviewCount),
      bestRating: '5',
      worstRating: '1'
    };
  }

  return ld;
}

export function buildOrganizationLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@snackora.in'
    }
  };
}

export function buildBreadcrumbLD(items) {
  // items: [{ name, url }]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url
    }))
  };
}
