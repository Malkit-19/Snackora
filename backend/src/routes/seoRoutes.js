/**
 * Snackora — Dynamic Sitemap & SEO Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates dynamic, search-engine compliant XML Sitemaps pulling real-time
 * products, categories, and static public marketing URLs from MongoDB.
 */
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');

const SITE_URL = process.env.CLIENT_URL || 'https://www.snackora.in';

/**
 * GET /sitemap.xml & /api/sitemap.xml
 * Dynamic XML sitemap for search crawlers (Googlebot, Bingbot, etc.)
 */
router.get(['/sitemap.xml', '/api/sitemap.xml'], async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ isAvailable: true })
        .select('slug updatedAt images name')
        .sort({ updatedAt: -1 })
        .lean(),
      Category.find({ isActive: true })
        .select('slug updatedAt name')
        .lean()
    ]);

    const staticRoutes = [
      { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${SITE_URL}/shop`, changefreq: 'daily', priority: '0.9' },
      { loc: `${SITE_URL}/b2b`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6' }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Static Core Pages
    for (const route of staticRoutes) {
      xml += `  <url>\n`;
      xml += `    <loc>${route.loc}</loc>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 2. Category Pages
    for (const cat of categories) {
      if (cat.slug) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/shop?category=${encodeURIComponent(cat.slug)}</loc>\n`;
        if (cat.updatedAt) {
          xml += `    <lastmod>${new Date(cat.updatedAt).toISOString()}</lastmod>\n`;
        }
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // 3. Product Detail Pages
    for (const prod of products) {
      if (prod.slug) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/products/${encodeURIComponent(prod.slug)}</loc>\n`;
        if (prod.updatedAt) {
          xml += `    <lastmod>${new Date(prod.updatedAt).toISOString()}</lastmod>\n`;
        }
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;

        // Image extension for image search indexing
        const primaryImg = Array.isArray(prod.images) && prod.images.length > 0 ? (prod.images.find(img => img.isPrimary)?.url || prod.images[0]?.url) : null;
        if (primaryImg) {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${primaryImg}</image:loc>\n`;
          xml += `      <image:title>${(prod.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>\n`;
          xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    return res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /robots.txt
 * Serves dynamic robots.txt pointing to the accurate dynamic sitemap
 */
router.get('/robots.txt', (req, res) => {
  const robotsTxt = `# Snackora Robots.txt
User-agent: *
Allow: /
Allow: /shop
Allow: /shop/*
Allow: /products
Allow: /products/*
Allow: /b2b
Allow: /about
Allow: /contact

# Private User & Admin Pages
Disallow: /admin
Disallow: /admin/*
Disallow: /account
Disallow: /checkout
Disallow: /cart
Disallow: /wishlist
Disallow: /login
Disallow: /register
Disallow: /api/

Crawl-delay: 1
Host: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.header('Content-Type', 'text/plain');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  return res.status(200).send(robotsTxt);
});

module.exports = router;
