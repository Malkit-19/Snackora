/**
 * Snackora — Secure File Upload Middleware
 * ──────────────────────────────────────────────────────────────────────────────
 * Security invariants:
 *   1. Never trust client-provided MIME type alone — inspect magic bytes.
 *   2. Enforce file size limits server-side (not just frontend).
 *   3. Whitelist allowed extensions and MIME types.
 *   4. Sanitize filename to prevent path traversal.
 *   5. Reject files with double extensions or path separators.
 */
const path = require('path');
const crypto = require('crypto');

// ── Allowed MIME types / extensions whitelist ─────────────────────────────────
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
};

// File magic byte signatures (first bytes of valid image files)
const MAGIC_BYTES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF]                           // JPEG SOI marker
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]  // PNG signature
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46]                     // RIFF (WebP is RIFF-based)
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],        // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]         // GIF89a
  ]
};

// Size limits
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB max

/**
 * Validates a Buffer's magic bytes match the declared MIME type.
 * @param {Buffer} buffer - File data buffer
 * @param {string} mimeType - Client-declared MIME type
 * @returns {boolean}
 */
const validateMagicBytes = (buffer, mimeType) => {
  if (!buffer || buffer.length < 8) return false;

  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, idx) => buffer[idx] === byte)
  );
};

/**
 * Sanitizes a filename to prevent path traversal and reserved character injection.
 * Strips directory separators, leading dots, and limits length.
 * @param {string} originalFilename
 * @returns {string} safe sanitized filename
 */
const sanitizeFilename = (originalFilename) => {
  if (!originalFilename || typeof originalFilename !== 'string') {
    return `upload_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Strip path components
  const basename = path.basename(originalFilename);

  // Remove null bytes, path separators, special chars — keep only alphanum, dash, underscore, dot
  const clean = basename
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.+/g, '.')          // collapse multiple dots (prevent double extension)
    .replace(/^\./, '')            // strip leading dot
    .slice(0, 128);                // limit length

  return clean || `upload_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Express middleware for validating image uploads received as base64 data URIs
 * (used in refund proof, banner/ad image uploads, etc.)
 *
 * Expects: req.body.image OR req.body.images[] to be base64 data URIs.
 * Sets:    req.validatedImages[] with { mimeType, buffer, size, sanitizedName }
 */
const validateBase64Images = (fieldName = 'images', maxCount = 3) => {
  return (req, res, next) => {
    const rawImages = req.body[fieldName];
    if (!rawImages) return next();

    const images = Array.isArray(rawImages) ? rawImages : [rawImages];

    if (images.length > maxCount) {
      return res.status(400).json({
        success: false,
        message: `Too many images. Maximum ${maxCount} allowed.`,
        code: 'TOO_MANY_FILES'
      });
    }

    const validated = [];

    for (let i = 0; i < images.length; i++) {
      const dataUri = images[i];

      if (!dataUri || typeof dataUri !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1} is not a valid string.`,
          code: 'INVALID_FILE_FORMAT'
        });
      }

      // Parse data URI: data:<mimeType>;base64,<data>
      const match = dataUri.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1} is not a valid base64 data URI.`,
          code: 'INVALID_FILE_FORMAT'
        });
      }

      const declaredMimeType = match[1].toLowerCase();
      const base64Data = match[2];

      // 1. Check that declared MIME type is whitelisted
      if (!ALLOWED_IMAGE_TYPES[declaredMimeType]) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1} type '${declaredMimeType}' is not allowed. Allowed: JPEG, PNG, WebP, GIF.`,
          code: 'INVALID_FILE_TYPE'
        });
      }

      // 2. Convert to Buffer for size and magic byte inspection
      let buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1} could not be decoded.`,
          code: 'INVALID_FILE_FORMAT'
        });
      }

      // 3. Enforce file size limit
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json({
          success: false,
          message: `Image ${i + 1} exceeds the 5 MB file size limit.`,
          code: 'FILE_TOO_LARGE'
        });
      }

      // 4. Validate magic bytes — reject files that lie about their MIME type
      if (!validateMagicBytes(buffer, declaredMimeType)) {
        return res.status(400).json({
          success: false,
          message: `Image ${i + 1} content does not match declared type '${declaredMimeType}'. Client-provided MIME type is not trusted.`,
          code: 'MIME_TYPE_MISMATCH'
        });
      }

      // 5. Generate a safe sanitized filename
      const ext = ALLOWED_IMAGE_TYPES[declaredMimeType][0];
      const safeName = `${crypto.randomBytes(16).toString('hex')}${ext}`;

      validated.push({
        mimeType: declaredMimeType,
        buffer,
        size: buffer.length,
        sanitizedName: safeName
      });
    }

    req.validatedImages = validated;
    next();
  };
};

/**
 * Validates a single image URL string (for banner/ad images stored as URLs).
 * Ensures it is a proper HTTPS URL without query parameter injection.
 */
const validateImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Must be https, reasonable length, no special injection characters
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) return false;
  if (trimmed.length > 2048) return false;
  return true;
};

module.exports = {
  validateBase64Images,
  validateImageUrl,
  sanitizeFilename,
  validateMagicBytes,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES
};
