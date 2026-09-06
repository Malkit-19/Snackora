const Product = require('../models/Product');
const Category = require('../models/Category');

/**
 * Service to fetch single product by slug with category populated
 */
const getProductBySlugService = async (slug) => {
  const product = await Product.findOne({
    slug: slug.toLowerCase().trim(),
    isAvailable: true
  }).populate('category', 'name slug image');

  return product;
};

/**
 * Service to get featured products
 */
const getFeaturedProductsService = async (limit = 8) => {
  const products = await Product.find({
    isFeatured: true,
    isAvailable: true
  })
    .populate('category', 'name slug')
    .limit(limit)
    .sort({ 'ratings.average': -1 });

  return products;
};

module.exports = {
  getProductBySlugService,
  getFeaturedProductsService
};
