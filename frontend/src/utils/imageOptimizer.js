/**
 * Snackora Image Optimizer — Cloudinary Transformation Helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates correctly-parameterised Cloudinary transformation URLs that:
 *   • Auto-select format (WebP on Chrome/Firefox, AVIF where supported)
 *   • Compress to the lowest quality perceptually indistinguishable from the
 *     original (`q_auto:good`)
 *   • Crop/fit within a target width to prevent oversized image delivery
 *   • Reserve width/height via inline CSS to eliminate CLS (layout shift)
 *   • Support responsive `srcSet` for retina & mobile displays
 *
 * Falls back gracefully when the URL is not a Cloudinary URL.
 */

/**
 * Extract the Cloudinary base (cloud-name upload path) from an image URL,
 * injecting a transformation string just after /upload/.
 *
 * @param {string} url      - Original Cloudinary URL
 * @param {string} transforms - Cloudinary transformation string
 * @returns {string} - Transformed URL
 */
export function cloudinaryTransform(url, transforms = '') {
  if (!url || typeof url !== 'string') return url || '';

  // Handle Cloudinary URLs: https://res.cloudinary.com/{cloud}/image/upload/...
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transforms}/`);
  }

  // Non-Cloudinary URLs returned as-is (e.g. seed data placeholder images)
  return url;
}

/**
 * Generate a responsive, auto-optimized Cloudinary image URL.
 *
 * @param {string} url          - Original image URL
 * @param {object} options      - Transformation options
 * @param {number} options.width      - Target max width in pixels (default 800)
 * @param {number} options.height     - Target max height (optional, crop-only)
 * @param {string} options.crop       - Crop mode: 'limit' | 'fill' | 'thumb' | 'crop' (default 'limit')
 * @param {string} options.gravity    - Gravity for fill/thumb: 'auto' | 'face' | 'center'
 * @param {string} options.quality    - Quality: 'auto' | 'auto:good' | 'auto:eco' (default 'auto')
 * @param {string} options.format     - Force format: 'webp' | 'avif' | 'auto' (default 'auto')
 * @returns {string} - Optimized Cloudinary URL
 */
export function optimizeImage(url, options = {}) {
  const {
    width = 800,
    height,
    crop = 'limit',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto'
  } = options;

  let parts = [`f_${format}`, `q_${quality}`, `w_${width}`, `c_${crop}`];

  if (height) parts.push(`h_${height}`);
  if ((crop === 'fill' || crop === 'thumb') && gravity) parts.push(`g_${gravity}`);

  return cloudinaryTransform(url, parts.join(','));
}

/**
 * Generate a product card thumbnail (square, face/auto gravity)
 * Typical: 400×400 for 2-col grid, 600×600 for 3-col
 */
export function productThumb(url, size = 400) {
  return optimizeImage(url, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Generate a product hero image (wide banner / detail page)
 */
export function productHero(url, width = 960) {
  return optimizeImage(url, {
    width,
    crop: 'limit',
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Generate srcSet string for responsive images (1x, 1.5x, 2x).
 *
 * @param {string} url      - Original Cloudinary URL
 * @param {number} baseW    - Base width in CSS pixels
 * @param {object} options  - Additional transform options
 * @returns {string}        - srcSet attribute value
 */
export function cloudinarySrcSet(url, baseW = 400, options = {}) {
  const sizes = [1, 1.5, 2];
  return sizes
    .map(dpr => {
      const w = Math.round(baseW * dpr);
      const transformed = optimizeImage(url, { ...options, width: w });
      return `${transformed} ${w}w`;
    })
    .join(', ');
}

/**
 * Build a complete set of optimized image props for an <img> element.
 * Prevents CLS by always declaring width and height.
 *
 * @param {string} url        - Original image URL
 * @param {string} alt        - Alt text (required for accessibility)
 * @param {number} width      - CSS width in pixels
 * @param {number} height     - CSS height in pixels  
 * @param {object} options    - Additional options
 * @param {boolean} options.lazy    - Use native lazy loading (default true)
 * @param {boolean} options.hero    - Is this a hero/LCP image? Set eager loading
 * @returns {object}          - Spread onto <img> element props
 */
export function buildImageProps(url, alt, width = 400, height = 400, options = {}) {
  const { lazy = true, hero = false } = options;

  const optimizedSrc = optimizeImage(url, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: hero ? 'auto:best' : 'auto',
    format: 'auto'
  });

  return {
    src: optimizedSrc,
    srcSet: cloudinarySrcSet(url, width, { height, crop: 'fill', gravity: 'auto' }),
    sizes: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${width}px`,
    alt: alt || '',
    width,
    height,
    loading: hero ? 'eager' : (lazy ? 'lazy' : undefined),
    decoding: hero ? 'sync' : 'async',
    style: { aspectRatio: `${width}/${height}`, objectFit: 'cover' }
  };
}

/**
 * Check whether a URL is a Cloudinary URL.
 */
export function isCloudinaryUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}
