/**
 * Snackora — Image Upload Controller (Cloudinary)
 * POST /api/upload  — ADMIN only
 * Accepts multipart/form-data with field "image" (single file)
 * OR JSON body with { image: "<base64 data URI>" }
 */
const { uploadImage } = require('../services/cloudinaryService');

const uploadImageToCloudinary = async (req, res, next) => {
  try {
    let source;
    const folder = req.body?.folder || req.query?.folder || 'snackora';

    if (req.file) {
      // Multer memory-storage buffer
      source = req.file.buffer;
    } else if (req.body?.image) {
      // Base64 data URI sent as JSON
      source = req.body.image;
    } else {
      return res.status(400).json({ success: false, message: 'No image provided. Send a file via multipart or base64 in body.image.' });
    }

    const result = await uploadImage(source, { folder });

    return res.status(200).json({
      success: true,
      message: 'Image uploaded to Cloudinary successfully.',
      data: {
        url:      result.url,
        publicId: result.publicId,
        width:    result.width,
        height:   result.height,
        format:   result.format
      }
    });
  } catch (err) {
    console.error('[Upload] Cloudinary error:', err.message);
    return res.status(500).json({ success: false, message: 'Image upload failed: ' + err.message });
  }
};

module.exports = { uploadImageToCloudinary };
