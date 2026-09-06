const mongoose = require('mongoose');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

const VALID_TRANSACTION_TYPES = [
  'ORDER_RESERVED',
  'ORDER_CANCELLED',
  'ORDER_RETURNED',
  'ADMIN_ADJUSTMENT',
  'DAMAGE',
  'EXPIRED',
  'PURCHASE',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'RESERVE',
  'RELEASE'
];

/**
 * GET /api/admin/inventory
 * List all products with complete inventory details:
 * Physical Stock, Reserved Stock, Available Stock (stock - reserved), Low Stock Threshold, Stock Status.
 */
const getInventoryOverview = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const { status, search, lowStockOnly } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort({ stock: 1, name: 1 });

    // Map virtual properties and compute statuses
    const inventoryList = products.map((p) => {
      const stock = typeof p.stock === 'number' ? p.stock : 0;
      const reserved = typeof p.reservedStock === 'number' ? p.reservedStock : 0;
      const available = Math.max(stock - reserved, 0);
      const threshold = typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 10;

      let computedStatus = 'IN_STOCK';
      if (available <= 0) computedStatus = 'OUT_OF_STOCK';
      else if (available <= threshold) computedStatus = 'LOW_STOCK';

      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: p.category,
        stock,
        reservedStock: reserved,
        availableStock: available,
        lowStockThreshold: threshold,
        stockStatus: computedStatus,
        isAvailable: p.isAvailable,
        updatedAt: p.updatedAt
      };
    });

    // Apply status filtering
    let filteredList = inventoryList;
    if (status) {
      filteredList = filteredList.filter((item) => item.stockStatus === status.toUpperCase());
    }
    if (lowStockOnly === 'true') {
      filteredList = filteredList.filter((item) => item.stockStatus === 'LOW_STOCK' || item.stockStatus === 'OUT_OF_STOCK');
    }

    const total = filteredList.length;
    const paginatedList = filteredList.slice(skip, skip + limit);

    // Summary counters across all products
    const overviewSummary = {
      totalProducts: inventoryList.length,
      inStockCount: inventoryList.filter((i) => i.stockStatus === 'IN_STOCK').length,
      lowStockCount: inventoryList.filter((i) => i.stockStatus === 'LOW_STOCK').length,
      outOfStockCount: inventoryList.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length
    };

    return sendSuccess(res, 'Inventory overview retrieved successfully.', {
      inventory: paginatedList,
      summary: overviewSummary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/inventory/adjust & PATCH /api/admin/inventory/:id
 * Manually adjust physical stock or threshold.
 * MANDATORY REQUIREMENT: Every manual adjustment requires a mandatory reason.
 * SAFETY GUARANTEE: Never allow negative available stock.
 */
const adjustInventory = async (req, res, next) => {
  try {
    const productId = req.params.id || req.body.productId;
    const {
      newStock,
      adjustmentQuantity,
      lowStockThreshold,
      type = 'ADMIN_ADJUSTMENT',
      reason,
      reference
    } = req.body;

    // 1. Mandatory Reason Validation
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return sendError(
        res,
        'Every manual inventory adjustment requires a mandatory reason.',
        400,
        'MANDATORY_REASON_REQUIRED'
      );
    }

    const validatedType = VALID_TRANSACTION_TYPES.includes(type) ? type : 'ADMIN_ADJUSTMENT';

    // 2. Fetch Product
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    const prevStock = product.stock || 0;
    const prevReserved = product.reservedStock || 0;

    let targetStock = prevStock;
    const adjQty = adjustmentQuantity !== undefined ? adjustmentQuantity : req.body.quantity;

    if (newStock !== undefined && !isNaN(Number(newStock))) {
      targetStock = Number(newStock);
    } else if (adjQty !== undefined && !isNaN(Number(adjQty))) {
      targetStock = prevStock + Number(adjQty);
    }

    // 3. Safety Guard: Stock cannot be negative
    if (targetStock < 0) {
      return sendError(res, 'Physical stock count cannot be negative.', 400, 'INVALID_STOCK');
    }

    // 4. Safety Guard: Available stock (stock - reservedStock) cannot be negative
    const targetAvailable = targetStock - prevReserved;
    if (targetAvailable < 0) {
      return sendError(
        res,
        `Cannot adjust stock to ${targetStock}. Reserved stock is ${prevReserved} units. Target available stock (${targetAvailable}) would be negative.`,
        400,
        'NEGATIVE_AVAILABLE_STOCK_BLOCKED',
        { currentReservedStock: prevReserved, targetStock }
      );
    }

    // Apply updates
    product.stock = targetStock;
    if (lowStockThreshold !== undefined && !isNaN(Number(lowStockThreshold)) && Number(lowStockThreshold) >= 0) {
      product.lowStockThreshold = Number(lowStockThreshold);
    }
    await product.save();

    const deltaQuantity = targetStock - prevStock;

    // 5. Create Inventory Transaction Ledger Entry
    const transaction = await InventoryTransaction.create({
      product: product._id,
      sku: product.sku,
      type: validatedType,
      quantity: deltaQuantity,
      previousStock: prevStock,
      newStock: targetStock,
      previousReserved: prevReserved,
      newReserved: prevReserved,
      reason: reason.trim(),
      reference: reference || `MANUAL-${Date.now()}`,
      performedBy: req.user._id
    });

    // 6. Audit Log Entry
    await createAuditLog({
      req,
      action: 'INVENTORY_ADJUSTMENT',
      resourceType: 'Product',
      resourceId: product._id,
      changes: {
        sku: product.sku,
        previousStock: prevStock,
        newStock: targetStock,
        adjustmentQuantity: deltaQuantity,
        type: validatedType,
        reason: reason.trim()
      }
    });

    const updatedAvailable = Math.max(product.stock - product.reservedStock, 0);
    let updatedStatus = 'IN_STOCK';
    if (updatedAvailable <= 0) updatedStatus = 'OUT_OF_STOCK';
    else if (updatedAvailable <= product.lowStockThreshold) updatedStatus = 'LOW_STOCK';

    return sendSuccess(res, `Inventory for '${product.name}' adjusted successfully.`, {
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: updatedAvailable,
        lowStockThreshold: product.lowStockThreshold,
        stockStatus: updatedStatus
      },
      transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/inventory/transactions
 * View inventory transaction ledger history across all products or for a specific product
 */
const getInventoryTransactions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const { productId, sku, type } = req.query;

    const query = {};

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      query.product = productId;
    }
    if (sku) {
      query.sku = sku.toUpperCase().trim();
    }
    if (type && VALID_TRANSACTION_TYPES.includes(type.toUpperCase())) {
      query.type = type.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('product', 'name sku images')
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryTransaction.countDocuments(query)
    ]);

    return sendSuccess(res, 'Inventory transaction ledger retrieved.', {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/inventory/quick-restock & POST /api/admin/inventory/:id/quick-restock
 * 1-Click Instant Restock for Admin (default +50 or custom quantity)
 */
const quickRestockProduct = async (req, res, next) => {
  try {
    const productId = req.params.id || req.body.productId;
    const quantity = parseInt(req.body.quantity, 10) || 50;

    if (!productId) {
      return sendError(res, 'productId is required for quick restock.', 400, 'VALIDATION_ERROR');
    }

    if (quantity <= 0) {
      return sendError(res, 'Restock quantity must be greater than 0.', 400, 'VALIDATION_ERROR');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found.', 404, 'NOT_FOUND');
    }

    const prevStock = typeof product.stock === 'number' ? product.stock : 0;
    const prevReserved = typeof product.reservedStock === 'number' ? product.reservedStock : 0;
    const newStock = prevStock + quantity;

    product.stock = newStock;
    product.isAvailable = true;
    product.active = true;
    await product.save();

    // Create ledger transaction
    const transaction = await InventoryTransaction.create({
      product: product._id,
      sku: product.sku,
      type: 'PURCHASE',
      quantity,
      previousStock: prevStock,
      newStock,
      previousReserved: prevReserved,
      newReserved: prevReserved,
      reason: `1-Click Instant Restock (+${quantity} units)`,
      reference: `RESTOCK-${Date.now()}`,
      performedBy: req.user._id
    });

    await createAuditLog({
      req,
      action: 'INVENTORY_QUICK_RESTOCK',
      resourceType: 'Product',
      resourceId: product._id,
      changes: {
        sku: product.sku,
        previousStock: prevStock,
        newStock,
        restockedQuantity: quantity,
        reason: `1-Click Instant Restock (+${quantity} units)`
      }
    });

    const updatedAvailable = Math.max(newStock - prevReserved, 0);
    const threshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : 10;
    let updatedStatus = 'IN_STOCK';
    if (updatedAvailable <= 0) updatedStatus = 'OUT_OF_STOCK';
    else if (updatedAvailable <= threshold) updatedStatus = 'LOW_STOCK';

    return sendSuccess(res, `Successfully restocked '${product.name}' with +${quantity} units!`, {
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        reservedStock: product.reservedStock,
        availableStock: updatedAvailable,
        lowStockThreshold: product.lowStockThreshold,
        stockStatus: updatedStatus
      },
      transaction
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventoryOverview,
  adjustInventory,
  getInventoryTransactions,
  quickRestockProduct
};
