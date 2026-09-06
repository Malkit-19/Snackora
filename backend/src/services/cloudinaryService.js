/**
 * Snackora — Cloudinary Image Service
 */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true
});

const uploadImage = (source, opts = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      folder:         opts.folder || 'snackora',
      resource_type:  'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: opts.transformation || [
        { width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ],
      ...opts
    };

    const handleResult = (error, result) => {
      if (error) return reject(error);
      resolve({
        url:      result.secure_url,
        publicId: result.public_id,
        width:    result.width,
        height:   result.height,
        format:   result.format
      });
    };

    if (Buffer.isBuffer(source)) {
      const stream = cloudinary.uploader.upload_stream(options, handleResult);
      const { Readable } = require('stream');
      Readable.from(source).pipe(stream);
    } else if (typeof source === 'string') {
      cloudinary.uploader.upload(source, options, handleResult);
    } else {
      reject(new Error('Invalid source: must be a Buffer or base64/URL string.'));
    }
  });
};

const deleteImage = async (publicId) => {
  if (!publicId) return { result: 'no-op' };
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadImage, deleteImage, cloudinary };
