const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

/**
 * POST /api/products/:id/reviews
 * Submit or update a product review.
 * RULE: Only verified purchasers can review.
 */
const createProductReview = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { rating, title = '', comment, body } = req.body;
    const reviewComment = comment || body;

    if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return sendError(res, 'Rating is required and must be an integer between 1 and 5.', 400, 'VALIDATION_ERROR');
    }
    if (!reviewComment || !reviewComment.trim()) {
      return sendError(res, 'Review comment is required.', 400, 'VALIDATION_ERROR');
    }

    // 1. Verify Product exists
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    // 2. Verified Purchaser Rule:
    // Check if user has placed an order containing this product
    const verifiedOrder = await Order.findOne({
      user: req.user._id,
      'items.product': product._id,
      orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] }
    });

    if (!verifiedOrder) {
      return sendError(
        res,
        'Only verified customers who have purchased this snack can submit a product review.',
        403,
        'ONLY_VERIFIED_PURCHASERS_CAN_REVIEW'
      );
    }

    // 3. Check for existing review by this user on this product (update if exists)
    let review = await Review.findOne({ product: product._id, user: req.user._id });

    if (review) {
      review.rating = Number(rating);
      review.title = title ? title.trim() : review.title;
      review.comment = reviewComment.trim();
      review.userName = req.user.name || review.userName;
      review.isVerifiedPurchase = true;
      review.order = verifiedOrder._id;
      await review.save();
    } else {
      review = await Review.create({
        product: product._id,
        user: req.user._id,
        userName: req.user.name || 'Snackora Customer',
        rating: Number(rating),
        title: title ? title.trim() : '',
        comment: reviewComment.trim(),
        isVerifiedPurchase: true,
        order: verifiedOrder._id
      });
    }

    // 4. Synchronize Product average rating and review count
    await Review.syncProductRating(product._id);

    // 5. Audit Log
    await createAuditLog({
      req,
      action: 'REVIEW_SUBMITTED',
      resourceType: 'Product',
      resourceId: product._id,
      changes: {
        reviewId: review._id,
        rating: review.rating,
        isVerifiedPurchase: true
      }
    });

    const updatedProduct = await Product.findById(product._id).select('ratings rating reviewCount');

    return sendSuccess(res, 'Review submitted successfully!', {
      review,
      productRatings: updatedProduct?.ratings
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id/reviews
 * Public: Fetch reviews for a product with breakdown distribution
 */
const getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const [reviews, total, breakdown] = await Promise.all([
      Review.find({ product: productId, status: 'APPROVED' })
        .populate('user', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ product: productId, status: 'APPROVED' }),
      Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), status: 'APPROVED' } },
        { $group: { _id: '$rating', count: { $sum: 1 } } }
      ])
    ]);

    // Build star distribution map
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    breakdown.forEach(({ _id, count }) => {
      distribution[_id] = count;
      totalScore += _id * count;
    });

    const avgRating = total > 0 ? Math.round((totalScore / total) * 10) / 10 : 0;

    return sendSuccess(res, 'Product reviews retrieved.', {
      reviews,
      summary: {
        averageRating: avgRating,
        totalReviews: total,
        ratingDistribution: distribution
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reviews/:id
 * Authenticated: Edit own review (Prevent editing another user's review)
 */
const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, body } = req.body;
    const reviewComment = comment || body;

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 'Review not found.', 404, 'NOT_FOUND');
    }

    // Security check: Only author or ADMIN can edit
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return sendError(
        res,
        'You do not have permission to modify another customer\'s review.',
        403,
        'FORBIDDEN'
      );
    }

    const beforeState = review.toObject();

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return sendError(res, 'Rating must be between 1 and 5 stars.', 400, 'VALIDATION_ERROR');
      }
      review.rating = numRating;
    }
    if (title !== undefined) review.title = title.trim();
    if (reviewComment !== undefined && reviewComment.trim()) review.comment = reviewComment.trim();

    await review.save();
    await Review.syncProductRating(review.product);

    await createAuditLog({
      req,
      action: 'REVIEW_UPDATED',
      resourceType: 'Review',
      resourceId: review._id,
      changes: { before: beforeState, after: review.toObject() }
    });

    return sendSuccess(res, 'Review updated successfully.', { review });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reviews/:id
 * Authenticated: Delete own review or Admin moderation
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return sendError(res, 'Review not found.', 404, 'NOT_FOUND');
    }

    // Security check: Only author or ADMIN can delete
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return sendError(
        res,
        'You do not have permission to delete another customer\'s review.',
        403,
        'FORBIDDEN'
      );
    }

    const productId = review.product;
    await review.deleteOne();
    await Review.syncProductRating(productId);

    await createAuditLog({
      req,
      action: 'REVIEW_DELETED',
      resourceType: 'Review',
      resourceId: id,
      changes: { productId }
    });

    return sendSuccess(res, 'Review deleted successfully.', { deletedReviewId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews & /api/admin/reviews
 * Admin: Fetch all customer reviews across the platform
 */
const adminGetAllReviews = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find()
        .populate('product', 'name slug images')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments()
    ]);

    return sendSuccess(res, 'All reviews fetched successfully.', {
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProductReview,
  getProductReviews,
  updateReview,
  deleteReview,
  adminGetAllReviews
};

