const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * Authoritative check: Only ADMIN or APPROVED B2B Wholesaler can view wholesale pricing
 */
const isRequesterApprovedB2B = (user) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  return (
    user.role === USER_ROLES.B2B_WHOLESALER &&
    (user.b2bStatus === B2B_STATUS.APPROVED || user.b2bProfile?.verificationStatus === B2B_STATUS.APPROVED)
  );
};

/**
 * Flavour keyword matcher for Makhana flavours
 */
const getFlavourRegex = (flavourSlug) => {
  const map = {
    'normal': '(normal|classic salted|himalayan salt|salt)',
    'peri-peri': '(peri peri|peri-peri|fiery peri)',
    'cream-and-onion': '(cream & onion|cream and onion|sour cream)',
    'black-pepper': '(black pepper|pepper)',
    'tomato': '(tomato|tangy tomato)',
    'indian-touch': '(indian touch|masala touch|royal indian)'
  };
  const pattern = map[flavourSlug.toLowerCase()] || flavourSlug.replace('-', ' ');
  return new RegExp(pattern, 'i');
};

/**
 * PUBLIC: GET /api/products & /api/v1/products
 * Supported filters: category, flavour, minPrice, maxPrice, search, rating, availability/inStock, sort, page, limit
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      category,
      flavour,
      minPrice,
      maxPrice,
      inStock,
      availability,
      rating,
      minRating,
      search,
      sort,
      page = 1,
      limit = 8
    } = req.query;

    const query = { isAvailable: true };

    // 1. Category Filter
    if (category && category !== 'all') {
      let catDoc;
      if (mongoose.Types.ObjectId.isValid(category)) {
        catDoc = await Category.findById(category);
      } else {
        catDoc = await Category.findOne({ slug: String(category).toLowerCase().trim() });
      }

      if (catDoc) {
        query.category = catDoc._id;
      } else {
        return sendSuccess(res, 'No products found for this category.', {
          products: [],
          pagination: { total: 0, page: 1, pages: 0, limit: parseInt(limit, 10), hasNextPage: false, hasPrevPage: false },
          isWholesaleView: false
        });
      }
    }

    // 2. Flavour Filter
    if (flavour && flavour !== 'all') {
      const flavourRegex = getFlavourRegex(flavour);
      query.$or = [
        { name: { $regex: flavourRegex } },
        { slug: { $regex: flavourRegex } },
        { description: { $regex: flavourRegex } },
        { flavour: { $regex: flavourRegex } },
        { tags: { $in: [flavourRegex] } }
      ];
    }

    // 3. Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.retailPrice = {};
      if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        query.retailPrice.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        query.retailPrice.$lte = Number(maxPrice);
      }
    }

    // 4. Availability Filter
    const shouldFilterInStock = inStock === 'true' || inStock === true || availability === 'inStock' || availability === 'true';
    if (shouldFilterInStock) {
      query.stock = { $gt: 0 };
    }

    // 5. Rating Filter
    const ratingThreshold = rating || minRating;
    if (ratingThreshold !== undefined && !isNaN(Number(ratingThreshold))) {
      query['ratings.average'] = { $gte: Number(ratingThreshold) };
    }

    // 6. Keyword Search Filter
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchCondition = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { shortDescription: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
        { sku: { $regex: searchRegex } }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCondition }];
        delete query.$or;
      } else {
        query.$or = searchCondition;
      }
    }

    // 7. Authoritative Sorting
    let sortOption = { 'ratings.count': -1, 'ratings.average': -1 };
    if (sort === 'popular') {
      sortOption = { 'ratings.count': -1, 'ratings.average': -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'price_asc') {
      sortOption = { retailPrice: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { retailPrice: -1 };
    } else if (sort === 'rating') {
      sortOption = { 'ratings.average': -1 };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 8, 1);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    // 8. Strict B2B Wholesale Security:
    // Only return wholesale pricing and MOQ if requester is an approved B2B partner or admin.
    const canSeeWholesale = isRequesterApprovedB2B(req.user);
    const sanitizedProducts = products.map((p) => p.toRoleSpecificJSON(canSeeWholesale));

    return sendSuccess(res, 'Products fetched successfully.', {
      products: sanitizedProducts,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      isWholesaleView: canSeeWholesale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC: GET /api/products/:id (Accepts MongoDB ObjectId OR product slug)
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category', 'name slug description');
    }

    if (!product) {
      product = await Product.findOne({ slug: String(id).toLowerCase().trim(), isAvailable: true })
        .populate('category', 'name slug description');
    }

    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    const canSeeWholesale = isRequesterApprovedB2B(req.user);

    return sendSuccess(res, 'Product fetched successfully.', {
      product: product.toRoleSpecificJSON(canSeeWholesale),
      isWholesaleView: canSeeWholesale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Alias for getProductById
 */
const getProductBySlug = getProductById;

/**
 * PUBLIC: GET /api/products/featured
 */
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isAvailable: true })
      .populate('category', 'name slug')
      .limit(8)
      .sort({ 'ratings.average': -1 });

    const canSeeWholesale = isRequesterApprovedB2B(req.user);
    const sanitizedProducts = products.map((p) => p.toRoleSpecificJSON(canSeeWholesale));

    return sendSuccess(res, 'Featured products retrieved.', {
      products: sanitizedProducts,
      isWholesaleView: canSeeWholesale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: POST /api/products
 * Create a new product (Requires ADMIN role)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      sku,
      description,
      shortDescription,
      category,
      flavour,
      weight,
      retailPrice,
      retailDiscountPrice,
      wholesalePrice,
      b2bMoq,
      moq,
      stock,
      images,
      featured,
      active,
      tags,
      nutritionalInfo
    } = req.body;

    // Validation 1: Required Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'Product name is required.', 400, 'VALIDATION_ERROR');
    }

    // Validation 2: Required SKU
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      return sendError(res, 'Product SKU is required.', 400, 'VALIDATION_ERROR');
    }

    // Validation 3: SKU Uniqueness
    const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return sendError(res, `A product with SKU '${sku.toUpperCase().trim()}' already exists.`, 409, 'DUPLICATE_RESOURCE');
    }

    // Validation 4: Prices >= 0
    const effRetailPrice = retailPrice !== undefined ? retailPrice : (req.body.price !== undefined ? req.body.price : undefined);
    if (effRetailPrice === undefined || isNaN(Number(effRetailPrice)) || Number(effRetailPrice) < 0) {
      return sendError(res, 'Retail price is required and must be >= 0.', 400, 'VALIDATION_ERROR');
    }

    const effectiveWholesalePrice = wholesalePrice !== undefined ? Number(wholesalePrice) : (req.body.b2bPrice !== undefined ? Number(req.body.b2bPrice) : Number(effRetailPrice) * 0.6);
    if (effectiveWholesalePrice < 0) {
      return sendError(res, 'Wholesale / B2B price cannot be negative.', 400, 'VALIDATION_ERROR');
    }

    // Validation 5: Stock >= 0
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0) {
      return sendError(res, 'Stock count is required and must be >= 0.', 400, 'VALIDATION_ERROR');
    }

    // Validation 6: MOQ >= 1
    const effectiveMoq = b2bMoq || moq || 10;
    if (Number(effectiveMoq) < 1) {
      return sendError(res, 'Minimum Order Quantity (MOQ) must be at least 1.', 400, 'VALIDATION_ERROR');
    }

    // Validation 7: Category
    let categoryId = category;
    if (!categoryId) {
      return sendError(res, 'Category is required.', 400, 'VALIDATION_ERROR');
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const catDoc = await Category.findOne({ slug: String(categoryId).toLowerCase().trim() });
      if (!catDoc) {
        return sendError(res, 'Invalid category specified.', 400, 'VALIDATION_ERROR');
      }
      categoryId = catDoc._id;
    }

    // Generate or sanitize slug
    const finalSlug = slug
      ? slug.toLowerCase().trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existingSlug = await Product.findOne({ slug: finalSlug });
    if (existingSlug) {
      return sendError(res, `A product with slug '${finalSlug}' already exists.`, 409, 'DUPLICATE_RESOURCE');
    }

    const product = await Product.create({
      name: name.trim(),
      slug: finalSlug,
      sku: sku.toUpperCase().trim(),
      description: description ? description.trim() : name.trim(),
      shortDescription: shortDescription ? shortDescription.trim() : '',
      category: categoryId,
      flavour: flavour ? flavour.trim() : 'Original',
      weight: weight ? weight.trim() : '100g',
      unit: weight ? weight.trim() : '100g',
      retailPrice: Number(effRetailPrice),
      retailDiscountPrice: retailDiscountPrice ? Number(retailDiscountPrice) : undefined,
      wholesalePrice: effectiveWholesalePrice,
      b2bPrice: effectiveWholesalePrice,
      b2bMoq: Number(effectiveMoq),
      moq: Number(effectiveMoq),
      stock: Number(stock),
      images: Array.isArray(images) && images.length > 0 ? images : [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80', isPrimary: true }],
      featured: Boolean(featured),
      isFeatured: Boolean(featured),
      active: active !== undefined ? Boolean(active) : true,
      isAvailable: active !== undefined ? Boolean(active) : true,
      tags: Array.isArray(tags) ? tags : [],
      nutritionalInfo: nutritionalInfo || {}
    });

    await createAuditLog({
      req,
      action: 'PRODUCT_CREATE',
      resourceType: 'Product',
      resourceId: product._id,
      changes: { after: product }
    });

    return sendSuccess(res, 'Product created successfully.', { product }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: PUT /api/products/:id
 * Update an existing product (Requires ADMIN role)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: String(id).toLowerCase().trim() });
    }

    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    const beforeState = product.toObject();
    const updates = req.body;

    // Price and stock validation on update
    if (updates.retailPrice !== undefined && (isNaN(Number(updates.retailPrice)) || Number(updates.retailPrice) < 0)) {
      return sendError(res, 'Retail price must be >= 0.', 400, 'VALIDATION_ERROR');
    }
    if (updates.wholesalePrice !== undefined && (isNaN(Number(updates.wholesalePrice)) || Number(updates.wholesalePrice) < 0)) {
      return sendError(res, 'Wholesale price must be >= 0.', 400, 'VALIDATION_ERROR');
    }
    if (updates.stock !== undefined && (isNaN(Number(updates.stock)) || Number(updates.stock) < 0)) {
      return sendError(res, 'Stock count must be >= 0.', 400, 'VALIDATION_ERROR');
    }
    if ((updates.moq !== undefined || updates.b2bMoq !== undefined) && Number(updates.moq || updates.b2bMoq) < 1) {
      return sendError(res, 'MOQ must be >= 1.', 400, 'VALIDATION_ERROR');
    }

    // SKU Uniqueness check on update
    if (updates.sku && updates.sku.toUpperCase().trim() !== product.sku) {
      const duplicateSku = await Product.findOne({
        sku: updates.sku.toUpperCase().trim(),
        _id: { $ne: product._id }
      });
      if (duplicateSku) {
        return sendError(res, `Another product already uses SKU '${updates.sku.toUpperCase().trim()}'.`, 409, 'DUPLICATE_RESOURCE');
      }
      product.sku = updates.sku.toUpperCase().trim();
    }

    // Apply allowed fields
    const allowedFields = [
      'name', 'slug', 'description', 'shortDescription', 'flavour', 'weight',
      'retailPrice', 'retailDiscountPrice', 'wholesalePrice', 'b2bPrice',
      'b2bMoq', 'moq', 'stock', 'reservedStock', 'images', 'featured',
      'isFeatured', 'active', 'isAvailable', 'tags', 'nutritionalInfo', 'category'
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        product[field] = updates[field];
      }
    });

    await product.save();

    await createAuditLog({
      req,
      action: 'PRODUCT_UPDATE',
      resourceType: 'Product',
      resourceId: product._id,
      changes: { before: beforeState, after: product }
    });

    return sendSuccess(res, 'Product updated successfully.', { product });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN: DELETE /api/products/:id
 * Delete or soft-delete a product (Requires ADMIN role)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let product;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ slug: String(id).toLowerCase().trim() });
    }

    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    const beforeState = product.toObject();
    await Product.findByIdAndDelete(product._id);

    await createAuditLog({
      req,
      action: 'PRODUCT_DELETE',
      resourceType: 'Product',
      resourceId: product._id,
      changes: { before: beforeState }
    });

    return sendSuccess(res, `Product '${product.name}' (SKU: ${product.sku}) deleted successfully.`, {
      deletedProductId: product._id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
