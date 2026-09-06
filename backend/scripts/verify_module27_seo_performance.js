/**
 * Snackora — Module 27 SEO + Performance Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests:
 *  1.  robots.txt exists and has correct directives
 *  2.  static sitemap.xml exists and is valid XML
 *  3.  SEO.jsx exists with title/meta/OG/JSON-LD support
 *  4.  imageOptimizer.js cloudinaryTransform works
 *  5.  imageOptimizer.js productThumb generates correct URL
 *  6.  imageOptimizer.js buildImageProps returns CLS-safe dimensions
 *  7.  cacheMiddleware.js: cache hit/miss logic
 *  8.  seoRoutes.js exists (dynamic sitemap + robots backend)
 *  9.  App.jsx uses React.lazy
 *  10. Product model has compound performance indexes
 *  11. server.js mounts seoRoutes
 *  12. server.js applies cacheMiddleware to products/categories
 */

const fs = require('fs');
const path = require('path');

// __dirname = e:\eceb\backend\scripts
// Go up 2 levels: scripts -> backend -> eceb (workspace root)
const BACKEND  = path.resolve(__dirname, '..');
const ROOT     = path.resolve(BACKEND, '..');
const FRONTEND = path.join(ROOT, 'frontend');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\n🔍  Snackora — Module 27 SEO + Performance Verification\n');

// ── robots.txt ────────────────────────────────────────────────────────────────
console.log('  ── robots.txt ──');
test('robots.txt exists in frontend/public', () => {
  const p = path.join(FRONTEND, 'public/robots.txt');
  readFile(p);
});

test('robots.txt disallows /admin', () => {
  const content = readFile(path.join(FRONTEND, 'public/robots.txt'));
  assert(content.includes('Disallow: /admin'), 'Missing Disallow: /admin');
});

test('robots.txt points to sitemap', () => {
  const content = readFile(path.join(FRONTEND, 'public/robots.txt'));
  assert(content.includes('Sitemap:'), 'Missing Sitemap: directive');
  assert(content.includes('sitemap.xml'), 'Missing sitemap.xml reference');
});

// ── static sitemap.xml ────────────────────────────────────────────────────────
console.log('\n  ── sitemap.xml ──');
test('sitemap.xml exists in frontend/public', () => {
  readFile(path.join(FRONTEND, 'public/sitemap.xml'));
});

test('sitemap.xml has XML declaration and urlset', () => {
  const content = readFile(path.join(FRONTEND, 'public/sitemap.xml'));
  assert(content.startsWith('<?xml'), 'Missing XML declaration');
  assert(content.includes('<urlset'), 'Missing <urlset> element');
  assert(content.includes('sitemaps.org'), 'Missing sitemap namespace');
});

test('sitemap.xml contains homepage and /shop URLs', () => {
  const content = readFile(path.join(FRONTEND, 'public/sitemap.xml'));
  assert(content.includes('<loc>'), 'No <loc> elements found');
  assert(content.includes('/shop'), 'Missing /shop URL');
});

// ── SEO.jsx ───────────────────────────────────────────────────────────────────
console.log('\n  ── SEO Component ──');
test('SEO.jsx exists', () => {
  readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
});

test('SEO.jsx sets document.title', () => {
  const content = readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
  assert(content.includes('document.title'), 'Missing document.title assignment');
});

test('SEO.jsx sets Open Graph tags (og:title)', () => {
  const content = readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
  assert(content.includes('og:title'), 'Missing og:title meta tag');
  assert(content.includes('og:description'), 'Missing og:description meta tag');
  assert(content.includes('og:image'), 'Missing og:image meta tag');
});

test('SEO.jsx sets Twitter Card tags', () => {
  const content = readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
  assert(content.includes('twitter:card'), 'Missing twitter:card');
});

test('SEO.jsx exports buildProductLD helper', () => {
  const content = readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
  assert(content.includes('buildProductLD'), 'Missing buildProductLD export');
  assert(content.includes('aggregateRating'), 'Missing aggregateRating in schema');
  assert(content.includes('@type'), 'Missing @type in JSON-LD');
});

test('SEO.jsx exports buildOrganizationLD helper', () => {
  const content = readFile(path.join(FRONTEND, 'src/components/common/SEO.jsx'));
  assert(content.includes('buildOrganizationLD'), 'Missing buildOrganizationLD export');
});

// ── imageOptimizer.js ─────────────────────────────────────────────────────────
console.log('\n  ── Image Optimizer ──');
test('imageOptimizer.js exists', () => {
  readFile(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
});

test('imageOptimizer cloudinaryTransform: injects transforms into Cloudinary URL', () => {
  const { cloudinaryTransform } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const result = cloudinaryTransform(url, 'f_auto,q_auto,w_400');
  assert(result.includes('/upload/f_auto,q_auto,w_400/'), 'Transform not injected correctly');
});

test('imageOptimizer cloudinaryTransform: passes through non-Cloudinary URLs unchanged', () => {
  const { cloudinaryTransform } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const url = 'https://example.com/image.jpg';
  const result = cloudinaryTransform(url, 'f_auto');
  assert(result === url, 'Non-Cloudinary URL was modified');
});

test('imageOptimizer productThumb: generates fill crop with auto gravity', () => {
  const { productThumb } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const result = productThumb(url, 400);
  assert(result.includes('c_fill'), 'Missing c_fill crop');
  assert(result.includes('g_auto'), 'Missing g_auto gravity');
  assert(result.includes('f_auto'), 'Missing f_auto format');
  assert(result.includes('q_auto'), 'Missing q_auto quality');
});

test('imageOptimizer buildImageProps: returns width + height for CLS prevention', () => {
  const { buildImageProps } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const props = buildImageProps('https://res.cloudinary.com/demo/image/upload/sample.jpg', 'Test', 400, 300);
  assert(props.width === 400, 'width not set correctly');
  assert(props.height === 300, 'height not set correctly');
  assert(props.loading === 'lazy', 'lazy loading not set');
  assert(props.style?.aspectRatio, 'Missing aspectRatio in style');
});

test('imageOptimizer buildImageProps: hero image gets eager loading', () => {
  const { buildImageProps } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const props = buildImageProps('https://res.cloudinary.com/demo/image/upload/sample.jpg', 'Hero', 1200, 600, { hero: true });
  assert(props.loading === 'eager', 'Hero image should have eager loading');
});

test('imageOptimizer cloudinarySrcSet: generates multi-width srcSet', () => {
  const { cloudinarySrcSet } = require(path.join(FRONTEND, 'src/utils/imageOptimizer.js'));
  const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const result = cloudinarySrcSet(url, 400);
  assert(result.includes('400w'), 'Missing 400w descriptor');
  assert(result.includes('600w'), 'Missing 600w (1.5x) descriptor');
  assert(result.includes('800w'), 'Missing 800w (2x) descriptor');
  // srcSet entries are separated by ", " but Cloudinary URLs also have "," in transforms
  // Count entries by width descriptor occurrences
  const wMatches = (result.match(/\d+w/g) || []).length;
  assert(wMatches === 3, `Should have 3 srcSet entries (found ${wMatches})`);
});


// ── cacheMiddleware.js ────────────────────────────────────────────────────────
console.log('\n  ── API Cache Middleware ──');
test('cacheMiddleware.js exists', () => {
  readFile(path.join(BACKEND, 'src/middleware/cacheMiddleware.js'));
});

test('cacheMiddleware: exports cacheMiddleware, invalidateCache, clearCacheOnMutation', () => {
  const mod = require(path.join(BACKEND, 'src/middleware/cacheMiddleware.js'));
  assert(typeof mod.cacheMiddleware === 'function', 'Missing cacheMiddleware function');
  assert(typeof mod.invalidateCache === 'function', 'Missing invalidateCache function');
  assert(typeof mod.clearCacheOnMutation === 'function', 'Missing clearCacheOnMutation function');
});

test('cacheMiddleware: skips authenticated requests', () => {
  const { cacheMiddleware } = require(path.join(BACKEND, 'src/middleware/cacheMiddleware.js'));
  const middleware = cacheMiddleware(60);
  let nextCalled = false;
  const req = { method: 'GET', headers: { authorization: 'Bearer token' }, originalUrl: '/api/products' };
  const res = {};
  middleware(req, res, () => { nextCalled = true; });
  assert(nextCalled, 'Should call next() for authenticated requests without caching');
});

test('cacheMiddleware: returns MISS header on first call', () => {
  const { cacheMiddleware, invalidateCache } = require(path.join(BACKEND, 'src/middleware/cacheMiddleware.js'));
  invalidateCache('/api/test-cache-miss');
  const middleware = cacheMiddleware(60);
  const headers = {};
  const req = { method: 'GET', headers: {}, originalUrl: '/api/test-cache-miss' };
  const res = {
    statusCode: 200,
    setHeader: (k, v) => { headers[k] = v; },
    json: (body) => { res._body = body; }
  };
  middleware(req, res, () => {});
  assert(headers['X-Snackora-Cache'] === 'MISS', 'Expected MISS header on first call');
});

// ── seoRoutes.js ──────────────────────────────────────────────────────────────
console.log('\n  ── Dynamic SEO Routes (Backend) ──');
test('seoRoutes.js exists', () => {
  readFile(path.join(BACKEND, 'src/routes/seoRoutes.js'));
});

test('seoRoutes.js defines GET /sitemap.xml route', () => {
  const content = readFile(path.join(BACKEND, 'src/routes/seoRoutes.js'));
  assert(content.includes('sitemap.xml'), 'Missing sitemap.xml route');
  assert(content.includes('application/xml'), 'Missing Content-Type: application/xml');
});

test('seoRoutes.js defines GET /robots.txt route', () => {
  const content = readFile(path.join(BACKEND, 'src/routes/seoRoutes.js'));
  assert(content.includes('robots.txt'), 'Missing robots.txt route');
  assert(content.includes('Disallow'), 'Missing Disallow directive in dynamic robots.txt');
});

test('seoRoutes.js includes image sitemap extension', () => {
  const content = readFile(path.join(BACKEND, 'src/routes/seoRoutes.js'));
  assert(content.includes('image:image'), 'Missing image sitemap extension');
});

// ── App.jsx code splitting ────────────────────────────────────────────────────
console.log('\n  ── React.lazy Code Splitting ──');
test('App.jsx uses React.lazy for all pages', () => {
  const content = readFile(path.join(FRONTEND, 'src/App.jsx'));
  assert(content.includes("lazy(() => import("), 'Missing React.lazy() dynamic imports');
  const lazyCount = (content.match(/lazy\(\(\)/g) || []).length;
  assert(lazyCount >= 10, `Expected ≥10 lazy page imports, found ${lazyCount}`);
});

test('App.jsx wraps routes in <Suspense>', () => {
  const content = readFile(path.join(FRONTEND, 'src/App.jsx'));
  assert(content.includes('<Suspense'), 'Missing <Suspense> wrapper');
  assert(content.includes('fallback'), 'Suspense missing fallback prop');
});

// ── Product model compound indexes ───────────────────────────────────────────
console.log('\n  ── MongoDB Compound Indexes ──');
test('Product.js has isAvailable + isFeatured compound index', () => {
  const content = readFile(path.join(BACKEND, 'src/models/Product.js'));
  assert(content.includes('isAvailable: 1, isFeatured: 1'), 'Missing isAvailable+isFeatured compound index');
});

test('Product.js has isAvailable + category compound index', () => {
  const content = readFile(path.join(BACKEND, 'src/models/Product.js'));
  assert(content.includes('isAvailable: 1, category: 1'), 'Missing isAvailable+category compound index');
});

test('Product.js has isAvailable + retailPrice index for price range', () => {
  const content = readFile(path.join(BACKEND, 'src/models/Product.js'));
  assert(content.includes('isAvailable: 1, retailPrice: 1'), 'Missing isAvailable+retailPrice index');
});

test('Product.js text index includes flavour field', () => {
  const content = readFile(path.join(BACKEND, 'src/models/Product.js'));
  assert(content.includes("flavour: 'text'"), 'Missing flavour in text index');
});

// ── server.js wiring ─────────────────────────────────────────────────────────
console.log('\n  ── Server.js Wiring ──');
test('server.js imports and mounts seoRoutes', () => {
  const content = readFile(path.join(BACKEND, 'src/server.js'));
  assert(content.includes("require('./routes/seoRoutes')"), 'seoRoutes not imported');
  assert(content.includes("app.use('/', seoRoutes)"), 'seoRoutes not mounted at /');
});

test('server.js applies cacheMiddleware to /api/products', () => {
  const content = readFile(path.join(BACKEND, 'src/server.js'));
  assert(content.includes("cacheMiddleware(300), productRoutes"), 'cacheMiddleware not applied to productRoutes');
});

test('server.js applies cacheMiddleware to /api/categories', () => {
  const content = readFile(path.join(BACKEND, 'src/server.js'));
  assert(content.includes("cacheMiddleware(300), categoryRoutes"), 'cacheMiddleware not applied to categoryRoutes');
});

// ── ProductDetailPage SEO ────────────────────────────────────────────────────
console.log('\n  ── Page-level SEO Integration ──');
test('ProductDetailPage imports SEO and buildProductLD', () => {
  const content = readFile(path.join(FRONTEND, 'src/pages/ProductDetailPage.jsx'));
  assert(content.includes("import SEO, { buildProductLD }"), 'ProductDetailPage missing SEO import');
});

test('ProductDetailPage renders <SEO> with product data', () => {
  const content = readFile(path.join(FRONTEND, 'src/pages/ProductDetailPage.jsx'));
  assert(content.includes('<SEO'), 'ProductDetailPage missing <SEO> render');
  assert(content.includes('structuredData={productLD}'), 'Missing structuredData prop');
});

test('HomePage imports and uses SEO + buildOrganizationLD', () => {
  const content = readFile(path.join(FRONTEND, 'src/pages/HomePage.jsx'));
  assert(content.includes('buildOrganizationLD'), 'HomePage missing buildOrganizationLD');
  assert(content.includes('<SEO'), 'HomePage missing <SEO> render');
});

test('ShopPage imports and uses SEO', () => {
  const content = readFile(path.join(FRONTEND, 'src/pages/ShopPage.jsx'));
  assert(content.includes("import SEO from '../components/common/SEO'"), 'ShopPage missing SEO import');
  assert(content.includes('<SEO'), 'ShopPage missing <SEO> render');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
const total = passed + failed;
console.log(`📊  Results: ${passed}/${total} tests passed`);
if (failed === 0) {
  console.log('🎉  Module 27 PASSED — SEO + Performance implementation complete!\n');
} else {
  console.log(`⚠️   ${failed} test(s) failed. Review issues above.\n`);
  process.exit(1);
}
