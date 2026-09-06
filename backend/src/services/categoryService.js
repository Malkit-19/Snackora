const Category = require('../models/Category');

/**
 * Service to fetch all active categories
 */
const getAllCategoriesService = async () => {
  return Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
};

/**
 * Service to fetch category by slug
 */
const getCategoryBySlugService = async (slug) => {
  return Category.findOne({ slug: slug.toLowerCase().trim(), isActive: true });
};

module.exports = {
  getAllCategoriesService,
  getCategoryBySlugService
};
