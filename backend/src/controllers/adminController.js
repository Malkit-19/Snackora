const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const B2BApplication = require('../models/B2BApplication');
const B2BRequest = require('../models/B2BRequest');
const Refund = require('../models/Refund');
const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Calculate date range filter bounds
 */
const getDateRangeFilter = (range, customFrom, customTo) => {
  const now = new Date();
  let fromDate = new Date();

  switch (range) {
    case 'today':
      fromDate.setHours(0, 0, 0, 0);
      break;
    case '7days':
      fromDate.setDate(now.getDate() - 7);
      break;
    case '30days':
      fromDate.setDate(now.getDate() - 30);
      break;
    case '3months':
      fromDate.setMonth(now.getMonth() - 3);
      break;
    case '12months':
      fromDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'custom':
      if (customFrom) fromDate = new Date(customFrom);
      else fromDate.setDate(now.getDate() - 30);
      break;
    default:
      fromDate.setDate(now.getDate() - 30); // Default to 30 days
  }

  const toDate = customTo && range === 'custom' ? new Date(customTo) : now;
  return { fromDate, toDate };
};

/**
 * GET /api/admin/dashboard
 * Complete Admin Dashboard Analytics API using real MongoDB data
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const { range = '30days', from, to } = req.query;
    const { fromDate, toDate } = getDateRangeFilter(range, from, to);

    const dateQuery = { createdAt: { $gte: fromDate, $lte: toDate } };

    // ── 1. REAL STAT CARDS ───────────────────────────────────────────────────
    const [
      revenueResult,
      totalOrdersCount,
      totalCustomersCount,
      approvedB2BCount,
      pendingB2BCount,
      lowStockProductsCount,
      pendingRefundsCount
    ] = await Promise.all([
      // Total Revenue (excluding CANCELLED)
      Order.aggregate([
        { $match: { ...dateQuery, orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      // Total Orders
      Order.countDocuments(dateQuery),
      // Total Retail Customers
      User.countDocuments({ role: 'CUSTOMER' }),
      // Total Approved B2B Users
      User.countDocuments({ role: 'B2B_WHOLESALER', b2bStatus: 'APPROVED' }),
      // Pending B2B Applications
      B2BApplication.countDocuments({ status: 'PENDING' }),
      // Low Stock Products (stock <= lowStockThreshold or stock <= 10)
      Product.countDocuments({ $expr: { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] } }),
      // Pending Refunds
      Refund ? Refund.countDocuments({ status: 'PENDING' }) : Promise.resolve(0)
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // ── 2. REVENUE & ORDERS OVER TIME GRAPH ──────────────────────────────────
    const revenueOverTime = await Order.aggregate([
      { $match: { ...dateQuery, orderStatus: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // ── 3. CUSTOMER VS B2B BREAKDOWN GRAPH ───────────────────────────────────
    const customerVsB2B = await Order.aggregate([
      { $match: { ...dateQuery, orderStatus: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: '$isB2BOrder',
          revenue: { $sum: '$pricing.total' },
          ordersCount: { $sum: 1 }
        }
      }
    ]);

    const customerVsB2BData = {
      retail: customerVsB2B.find(c => c._id === false) || { revenue: 0, ordersCount: 0 },
      b2b: customerVsB2B.find(c => c._id === true) || { revenue: 0, ordersCount: 0 }
    };

    // ── 4. CATEGORY SALES GRAPH ───────────────────────────────────────────────
    const categorySales = await Order.aggregate([
      { $match: { ...dateQuery, orderStatus: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.category', 'Uncategorized'] },
          totalSales: { $sum: '$items.total' },
          unitsSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    // ── 5. TOP PRODUCTS GRAPH ─────────────────────────────────────────────────
    const topProducts = await Order.aggregate([
      { $match: { ...dateQuery, orderStatus: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          sku: { $first: '$items.sku' },
          totalRevenue: { $sum: '$items.total' },
          unitsSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);

    // ── 6. PAYMENT METHODS BREAKDOWN GRAPH ───────────────────────────────────
    const paymentMethods = await Order.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.total' }
        }
      }
    ]);

    // ── 7. REFUNDS BREAKDOWN GRAPH ────────────────────────────────────────────
    let refundsSummary = [];
    if (Refund) {
      refundsSummary = await Refund.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]);
    }

    return sendSuccess(res, 'Admin analytics dashboard data retrieved successfully.', {
      filterRange: range,
      dateWindow: { from: fromDate, to: toDate },
      cards: {
        totalRevenue,
        totalOrders: totalOrdersCount,
        customers: totalCustomersCount,
        b2bUsers: approvedB2BCount,
        pendingB2B: pendingB2BCount,
        lowStock: lowStockProductsCount,
        refundRequests: pendingRefundsCount
      },
      graphs: {
        revenueOverTime,
        customerVsB2B: customerVsB2BData,
        categorySales,
        topProducts,
        paymentMethods,
        refundsSummary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/trigger-birthday-check
 * Manually run the birthday engine for today (or custom simulation date)
 */
const triggerBirthdayCheck = async (req, res, next) => {
  try {
    const birthdayService = require('../services/birthdayService');
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    const result = await birthdayService.checkAndDispatchBirthdayRewards(targetDate);
    return sendSuccess(res, `Birthday reward engine executed successfully for ${result.processedDate}.`, result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/send-whatsapp
 * Dispatch direct real-time WhatsApp message to any customer phone number
 */
const adminSendWhatsApp = async (req, res, next) => {
  try {
    const whatsappService = require('../services/whatsappService');
    const { phone, message } = req.body;

    if (!phone || !message) {
      return sendError(res, 'Phone number and message are required.', 400, 'VALIDATION_ERROR');
    }

    const result = await whatsappService.sendMessage({ to: phone, message });

    if (!result.success) {
      return sendError(res, result.error || 'Failed to dispatch WhatsApp message.', 400, 'WHATSAPP_DISPATCH_FAILED');
    }

    return sendSuccess(res, `WhatsApp message dispatched to +${result.to}!`, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  triggerBirthdayCheck,
  adminSendWhatsApp
};

