const mongoose = require('mongoose');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const deliveryService = require('../services/delivery');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { sendOrderShippedEmail, sendOrderDeliveredEmail } = require('../services/emailService');
const Notification = require('../models/Notification');

/**
 * Public: POST /api/delivery/rates
 * Calculate courier rate estimates and ETDs
 */
const getDeliveryRates = async (req, res, next) => {
  try {
    const { destinationPincode, weightKg = 0.5, cod = false } = req.body;

    if (!destinationPincode || !/^\d{6}$/.test(String(destinationPincode).trim())) {
      return sendError(res, 'Valid 6-digit destination pincode is required.', 400, 'VALIDATION_ERROR');
    }

    const rates = await deliveryService.getRates({
      destinationPincode: String(destinationPincode).trim(),
      weightKg: Number(weightKg) || 0.5,
      cod: Boolean(cod)
    });

    return sendSuccess(res, 'Delivery rates calculated.', {
      pincode: destinationPincode,
      weightKg,
      couriers: rates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer / Public: GET /api/orders/:id/tracking
 * Fetch tracking timeline and shipment info for an order
 */
const getOrderTracking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    // Auth check: order owner or Admin
    if (req.user && req.user.role !== 'ADMIN' && order.user._id.toString() !== req.user._id.toString()) {
      return sendError(res, 'Access denied.', 403, 'FORBIDDEN');
    }

    const shipment = await Shipment.findOne({ order: order._id }).sort({ createdAt: -1 });

    // Build timeline stages
    const STAGES = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentOrderIdx = STAGES.indexOf(order.orderStatus);

    const timeline = STAGES.map((stage, idx) => ({
      stage,
      label: stage.replace(/_/g, ' '),
      completed: currentOrderIdx >= idx,
      isCurrent: currentOrderIdx === idx,
      timestamp: order.statusHistory?.find((h) => h.status === stage)?.timestamp || null
    }));

    return sendSuccess(res, 'Order tracking retrieved.', {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        carrier: shipment?.courier || order.carrier || 'Standard Courier',
        trackingNumber: shipment?.trackingNumber || order.trackingNumber,
        trackingUrl: shipment?.trackingUrl || (order.trackingNumber ? `https://track.snackora.in/shipment/${order.trackingNumber}` : null),
        estimatedDelivery: order.estimatedDelivery || shipment?.events?.[0]?.timestamp
      },
      shipment: shipment || null,
      timeline,
      events: shipment?.events || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/admin/shipments
 * Create a new shipment for an order
 */
const adminCreateShipment = async (req, res, next) => {
  try {
    const { orderId, courierName = 'Blue Dart', weightKg = 0.5 } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, 'Valid orderId is required.', 400, 'VALIDATION_ERROR');
    }

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.orderStatus)) {
      return sendError(
        res,
        `Cannot create shipment for order in ${order.orderStatus} state.`,
        400,
        'INVALID_ORDER_STATE'
      );
    }

    // Call delivery service abstraction
    const carrierResult = await deliveryService.createShipment({
      order,
      origin: {
        name: 'Snackora Bengaluru Hub',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      },
      destination: {
        fullName: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        pincode: order.shippingAddress.pincode
      },
      items: order.items,
      weightKg: Number(weightKg) || 0.5,
      courierName
    });

    // Save Shipment record
    const shipment = await Shipment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      shipmentId: carrierResult.shipmentId,
      courier: carrierResult.courier || courierName,
      trackingNumber: carrierResult.trackingNumber,
      trackingUrl: carrierResult.trackingUrl,
      status: carrierResult.status || 'LABEL_CREATED',
      weightKg: Number(weightKg) || 0.5,
      shippingFee: carrierResult.shippingFee || 0,
      destination: {
        fullName: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        pincode: order.shippingAddress.pincode
      },
      events: carrierResult.events || [],
      provider: deliveryService.getActiveProviderName().toLowerCase().includes('shiprocket') ? 'shiprocket' : 'mock',
      rawResponse: carrierResult.rawResponse
    });

    // Update order status to SHIPPED
    order.orderStatus = 'SHIPPED';
    order.trackingNumber = carrierResult.trackingNumber;
    order.carrier = carrierResult.courier || courierName;
    order.statusHistory.push({
      status: 'SHIPPED',
      changedBy: req.user._id,
      changedByRole: 'ADMIN',
      note: `Shipment created via ${courierName}. AWB: ${carrierResult.trackingNumber}`
    });
    await order.save();

    // In-app notification & Email dispatch (non-blocking)
    try {
      await Notification.create({
        user: order.user._id,
        type: 'ORDER',
        title: `Order #${order.orderNumber} Shipped!`,
        message: `Your Snackora order is on its way via ${carrierResult.courier}. Tracking ID: ${carrierResult.trackingNumber}`,
        link: `/dashboard`
      });

      sendOrderShippedEmail({
        user: order.user,
        order,
        trackingNumber: carrierResult.trackingNumber,
        carrier: carrierResult.courier
      }).catch((e) => console.warn('[DeliveryEmail] Shipped email deferred:', e.message));
    } catch (notifErr) {
      console.warn('[DeliveryNotif] Failed:', notifErr.message);
    }

    // Audit Log
    await createAuditLog({
      req,
      action: 'SHIPMENT_CREATED',
      resourceType: 'Shipment',
      resourceId: shipment._id,
      changes: {
        orderNumber: order.orderNumber,
        trackingNumber: shipment.trackingNumber,
        courier: shipment.courier
      }
    });

    return sendSuccess(res, `Shipment created successfully. AWB: ${shipment.trackingNumber}`, {
      shipment,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/admin/shipments
 */
const adminGetAllShipments = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search.trim(), $options: 'i' } },
        { trackingNumber: { $regex: search.trim(), $options: 'i' } },
        { courier: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const shipments = await Shipment.find(query)
      .populate('order', 'orderNumber orderStatus pricing paymentMethod createdAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Shipments retrieved.', { shipments, total: shipments.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/admin/shipments/:id
 */
const adminGetShipmentById = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id).populate('order');
    if (!shipment) {
      return sendError(res, 'Shipment not found.', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'Shipment detail retrieved.', { shipment });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/admin/shipments/:id/cancel
 */
const adminCancelShipment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by warehouse admin' } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return sendError(res, 'Shipment not found.', 404, 'NOT_FOUND');
    }

    if (shipment.status === 'DELIVERED') {
      return sendError(res, 'Cannot cancel delivered shipment.', 400, 'INVALID_STATE');
    }

    // Delegate to delivery service
    await deliveryService.cancelShipment({
      shipmentId: shipment.shipmentId,
      trackingNumber: shipment.trackingNumber,
      reason
    });

    shipment.status = 'CANCELLED';
    shipment.events.push({
      status: 'CANCELLED',
      location: 'Logistics Center',
      message: `Shipment cancelled: ${reason}`,
      timestamp: new Date()
    });
    await shipment.save();

    await createAuditLog({
      req,
      action: 'SHIPMENT_CANCELLED',
      resourceType: 'Shipment',
      resourceId: shipment._id,
      changes: { trackingNumber: shipment.trackingNumber, reason }
    });

    return sendSuccess(res, `Shipment ${shipment.trackingNumber} cancelled.`, { shipment });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PATCH /api/admin/shipments/:id/status
 * Update shipment delivery milestone (e.g. OUT_FOR_DELIVERY, DELIVERED)
 */
const adminUpdateShipmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, location = 'City Hub', message = '' } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      return sendError(res, 'Shipment not found.', 404, 'NOT_FOUND');
    }

    shipment.status = status;
    shipment.events.push({
      status,
      location,
      message: message || `Status updated to ${status}`,
      timestamp: new Date()
    });
    await shipment.save();

    // Sync corresponding Order status if reaching final milestones
    const order = await Order.findById(shipment.order).populate('user');
    if (order) {
      if (status === 'OUT_FOR_DELIVERY') {
        order.orderStatus = 'OUT_FOR_DELIVERY';
        order.statusHistory.push({
          status: 'OUT_FOR_DELIVERY',
          changedBy: req.user._id,
          changedByRole: 'ADMIN',
          note: `Shipment out for delivery with ${shipment.courier}`
        });
        await order.save();
      } else if (status === 'DELIVERED') {
        order.orderStatus = 'DELIVERED';
        order.deliveredAt = new Date();
        order.statusHistory.push({
          status: 'DELIVERED',
          changedBy: req.user._id,
          changedByRole: 'ADMIN',
          note: `Package delivered to customer by ${shipment.courier}`
        });
        await order.save();

        // Send delivered email
        sendOrderDeliveredEmail({ user: order.user, order }).catch((e) =>
          console.warn('[DeliveredEmail] Deferred:', e.message)
        );
      }
    }

    return sendSuccess(res, `Shipment status updated to ${status}.`, { shipment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeliveryRates,
  getOrderTracking,
  adminCreateShipment,
  adminGetAllShipments,
  adminGetShipmentById,
  adminCancelShipment,
  adminUpdateShipmentStatus
};
