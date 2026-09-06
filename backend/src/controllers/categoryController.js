const Category = require('../models/Category');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Public: Fetch all active categories
 */
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    return sendSuccess(res, 'Categories retrieved successfully.', { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Fetch single category by slug
 */
const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) {
      return sendError(res, 'Category not found.', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'Category retrieved.', { category });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Fetch all categories (including inactive)
 */
const adminGetAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ displayOrder: 1, name: 1 });
    return sendSuccess(res, 'Admin: all categories retrieved.', { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new category
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Category name is required.', 400, 'VALIDATION_ERROR');
    }

    const generatedSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existingName = await Category.findOne({ name: name.trim() });
    if (existingName) {
      return sendError(res, 'A category with this name already exists.', 409, 'DUPLICATE_NAME');
    }

    const existingSlug = await Category.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return sendError(res, 'A category with this slug already exists.', 409, 'DUPLICATE_SLUG');
    }

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description ? description.trim() : '',
      image: image || '',
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive: isActive !== false
    });

    await createAuditLog({
      req,
      action: 'CATEGORY_CREATE',
      resourceType: 'Category',
      resourceId: category._id,
      changes: { after: category }
    });

    return sendSuccess(res, `Category '${category.name}' created successfully.`, { category }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update an existing category
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 'Category not found.', 404, 'NOT_FOUND');
    }

    const beforeState = category.toObject();
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    if (name && name.trim() !== category.name) {
      const existingName = await Category.findOne({ name: name.trim(), _id: { $ne: category._id } });
      if (existingName) return sendError(res, 'A category with this name already exists.', 409, 'DUPLICATE_NAME');
      category.name = name.trim();
    }

    if (slug && slug.trim() !== category.slug) {
      const generatedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingSlug = await Category.findOne({ slug: generatedSlug, _id: { $ne: category._id } });
      if (existingSlug) return sendError(res, 'A category with this slug already exists.', 409, 'DUPLICATE_SLUG');
      category.slug = generatedSlug;
    }

    if (description !== undefined) category.description = description.trim();
    if (image !== undefined) category.image = image;
    if (displayOrder !== undefined) category.displayOrder = parseInt(displayOrder, 10) || 0;
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    await createAuditLog({
      req,
      action: 'CATEGORY_UPDATE',
      resourceType: 'Category',
      resourceId: category._id,
      changes: { before: beforeState, after: category }
    });

    return sendSuccess(res, `Category '${category.name}' updated successfully.`, { category });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle category active/inactive status
 */
const toggleCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 'Category not found.', 404, 'NOT_FOUND');
    }

    const prevActive = category.isActive;
    category.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !category.isActive;
    await category.save();

    await createAuditLog({
      req,
      action: 'CATEGORY_STATUS_TOGGLE',
      resourceType: 'Category',
      resourceId: category._id,
      changes: { before: { isActive: prevActive }, after: { isActive: category.isActive } }
    });

    return sendSuccess(
      res,
      `Category '${category.name}' ${category.isActive ? 'activated' : 'deactivated'}.`,
      { category }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete category (dangerous operation — checked against existing products)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 'Category not found.', 404, 'NOT_FOUND');
    }

    // Check if products are linked to this category
    const productsCount = await Product.countDocuments({ category: category._id });
    if (productsCount > 0) {
      return sendError(
        res,
        `Cannot delete category '${category.name}' because ${productsCount} product(s) belong to it. Please reassign or delete the products first.`,
        409,
        'DEPENDENCY_CONFLICT',
        { linkedProductsCount: productsCount }
      );
    }

    const beforeState = category.toObject();
    await category.deleteOne();

    await createAuditLog({
      req,
      action: 'CATEGORY_DELETE',
      resourceType: 'Category',
      resourceId: id,
      changes: { before: beforeState }
    });

    return sendSuccess(res, `Category '${category.name}' deleted successfully.`, {});
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryBySlug,
  adminGetAllCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory
};
