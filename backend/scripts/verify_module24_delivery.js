/**
 * Comprehensive Automated Verification Suite for Module 24: Delivery Integration
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const request = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch (e) { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const runDeliveryTests = async () => {
  console.log('=== SNACKORA MODULE 24: DELIVERY INTEGRATION VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const User = require('../src/models/User');
  const Product = require('../src/models/Product');
  const Order = require('../src/models/Order');
  const Shipment = require('../src/models/Shipment');
  const Notification = require('../src/models/Notification');
  const EmailLog = require('../src/models/EmailLog');
  const AuditLog = require('../src/models/AuditLog');
  const ShiprocketDeliveryAdapter = require('../src/services/delivery/ShiprocketDeliveryAdapter');

  // Authenticate Admin and Customer
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custUser = custLogin.body.data?.user;
  const custH = { Authorization: `Bearer ${custToken}` };

  // ── TEST 1: Delivery Rates Abstraction & Pincode Validation ──────────────
  const ratesRes = await request('/api/delivery/rates', 'POST', {
    destinationPincode: '560034',
    weightKg: 1.2
  });

  console.log('[TEST 1] Delivery Rates Status:', ratesRes.status);
  const couriers = ratesRes.body.data?.couriers || [];
  console.log('[TEST 1] Couriers returned:', couriers.length);
  console.log('[TEST 1] Sample Courier Rate:', couriers[0]?.courierName, '₹' + couriers[0]?.rate);

  // Invalid pincode guard
  const badPincodeRes = await request('/api/delivery/rates', 'POST', {
    destinationPincode: '123'
  });
  console.log('[TEST 1] Bad Pincode Status:', badPincodeRes.status);

  if (ratesRes.status === 200 && couriers.length >= 2 && badPincodeRes.status === 400) {
    console.log('✅ TEST 1 PASSED: Delivery rates estimated across couriers; invalid pincodes rejected.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // ── TEST 2: Order Setup & Shipment Generation ─────────────────────────────
  let addrRes = await request('/api/addresses', 'GET', null, custH);
  let sampleAddress = addrRes.body.data?.addresses?.[0];
  const sampleProduct = await Product.findOne({ isAvailable: true });

  await request('/api/cart/items', 'POST', { productId: String(sampleProduct._id), quantity: 2 }, custH);
  const placeRes = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'COD'
  }, custH);

  const testOrder = placeRes.body.data?.order;
  console.log('[SETUP] Test order placed:', testOrder.orderNumber);

  // Admin creates shipment
  const createShipRes = await request('/api/admin/shipments', 'POST', {
    orderId: testOrder._id,
    courierName: 'Blue Dart Express',
    weightKg: 0.8
  }, adminH);

  console.log('[TEST 2] Create Shipment Status:', createShipRes.status);
  const createdShipment = createShipRes.body.data?.shipment;
  console.log('[TEST 2] Generated AWB (Tracking Number):', createdShipment?.trackingNumber);
  console.log('[TEST 2] Tracking URL:', createdShipment?.trackingUrl);
  console.log('[TEST 2] Updated Order Status:', createShipRes.body.data?.order?.status);

  const updatedOrderDoc = await Order.findById(testOrder._id);

  if (
    createShipRes.status === 201 &&
    createdShipment?.trackingNumber &&
    createdShipment?.trackingUrl &&
    updatedOrderDoc.orderStatus === 'SHIPPED' &&
    updatedOrderDoc.trackingNumber === createdShipment.trackingNumber
  ) {
    console.log('✅ TEST 2 PASSED: Shipment created with courier AWB; Order status transitioned to SHIPPED.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // ── TEST 3: Customer Notifications & Transactional Email ──────────────────
  const notif = await Notification.findOne({
    user: custUser._id,
    type: 'ORDER',
    title: { $regex: /Shipped/i }
  }).sort({ createdAt: -1 });

  const emailLog = await EmailLog.findOne({
    userId: custUser._id,
    templateType: 'ORDER_SHIPPED'
  }).sort({ createdAt: -1 });

  console.log('[TEST 3] In-App Shipped Notification created:', !!notif);
  console.log('[TEST 3] Shipped Transactional Email Log created:', !!emailLog);

  if (notif && emailLog) {
    console.log('✅ TEST 3 PASSED: Customer notified via in-app notification and transactional email.\n');
  } else {
    console.error('❌ TEST 3 FAILED: Notification/Email missing'); process.exit(1);
  }

  // ── TEST 4: Customer Order Tracking Timeline ──────────────────────────────
  const trackRes = await request(`/api/orders/${testOrder._id}/tracking`, 'GET', null, custH);
  console.log('[TEST 4] Tracking Timeline Status:', trackRes.status);
  const timeline = trackRes.body.data?.timeline || [];
  const trackingOrder = trackRes.body.data?.order;
  console.log('[TEST 4] Timeline Stages Count:', timeline.length);
  console.log('[TEST 4] Tracking Carrier:', trackingOrder?.carrier);
  console.log('[TEST 4] Tracking Number in Response:', trackingOrder?.trackingNumber);

  const isShippedCompleted = timeline.find((s) => s.stage === 'SHIPPED')?.completed;

  if (trackRes.status === 200 && timeline.length === 6 && isShippedCompleted === true) {
    console.log('✅ TEST 4 PASSED: Customer order tracking timeline returned with 6 visual stages.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: Shipment Milestone Progression & Order Synchronization ────────
  // 5a. OUT_FOR_DELIVERY
  const outRes = await request(`/api/admin/shipments/${createdShipment._id}/status`, 'PATCH', {
    status: 'OUT_FOR_DELIVERY',
    location: 'Bengaluru South Hub',
    message: 'Out for delivery with delivery agent'
  }, adminH);

  console.log('[TEST 5a] Update OUT_FOR_DELIVERY Status:', outRes.status);
  const midOrder = await Order.findById(testOrder._id);
  console.log('[TEST 5a] Synced Order Status:', midOrder.orderStatus);

  // 5b. DELIVERED
  const delivRes = await request(`/api/admin/shipments/${createdShipment._id}/status`, 'PATCH', {
    status: 'DELIVERED',
    location: 'Customer Address',
    message: 'Delivered to customer'
  }, adminH);

  console.log('[TEST 5b] Update DELIVERED Status:', delivRes.status);
  const finalOrder = await Order.findById(testOrder._id);
  console.log('[TEST 5b] Final Order Status:', finalOrder.orderStatus);
  console.log('[TEST 5b] Delivered At timestamp recorded:', !!finalOrder.deliveredAt);

  if (
    outRes.status === 200 &&
    midOrder.orderStatus === 'OUT_FOR_DELIVERY' &&
    delivRes.status === 200 &&
    finalOrder.orderStatus === 'DELIVERED' &&
    finalOrder.deliveredAt
  ) {
    console.log('✅ TEST 5 PASSED: Carrier milestone status changes synchronized Order to OUT_FOR_DELIVERY and DELIVERED.\n');
  } else {
    console.error('❌ TEST 5 FAILED'); process.exit(1);
  }

  // ── TEST 6: Shipment Cancellation Flow ────────────────────────────────────
  // Place another order and cancel shipment
  await request('/api/cart/items', 'POST', { productId: String(sampleProduct._id), quantity: 1 }, custH);
  const placeRes2 = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'COD'
  }, custH);
  const testOrder2 = placeRes2.body.data?.order;

  const ship2Res = await request('/api/admin/shipments', 'POST', {
    orderId: testOrder2._id,
    courierName: 'Delhivery Surface',
    weightKg: 0.5
  }, adminH);
  const shipment2 = ship2Res.body.data?.shipment;

  const cancelShipRes = await request(`/api/admin/shipments/${shipment2._id}/cancel`, 'POST', {
    reason: 'Customer requested cancellation prior to pickup'
  }, adminH);

  console.log('[TEST 6] Cancel Shipment Status:', cancelShipRes.status);
  console.log('[TEST 6] Cancelled Shipment Status:', cancelShipRes.body.data?.shipment?.status);

  if (cancelShipRes.status === 200 && cancelShipRes.body.data?.shipment?.status === 'CANCELLED') {
    console.log('✅ TEST 6 PASSED: Shipment cancelled with courier adapter successfully.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Shiprocket Adapter Architecture Verification ──────────────────
  const srAdapter = new ShiprocketDeliveryAdapter();
  console.log('[TEST 7] Shiprocket Adapter initialized:', srAdapter.name);
  console.log('[TEST 7] Has credentials without env:', srAdapter.hasValidCredentials());

  let credentialErrorCaught = false;
  try {
    await srAdapter.getAuthToken();
  } catch (err) {
    credentialErrorCaught = true;
    console.log('[TEST 7] Handled missing credentials gracefully:', err.message);
  }

  if (srAdapter.name === 'ShiprocketDeliveryAdapter' && credentialErrorCaught) {
    console.log('✅ TEST 7 PASSED: Shiprocket adapter architecture ready; fails safe without unverified claims.\n');
  } else {
    console.error('❌ TEST 7 FAILED'); process.exit(1);
  }

  // ── TEST 8: Admin Shipments Overview & Audit Logging ───────────────────────
  const allShipmentsRes = await request('/api/admin/shipments', 'GET', null, adminH);
  console.log('[TEST 8] Admin Shipments Overview Status:', allShipmentsRes.status);
  console.log('[TEST 8] Total shipments count in DB:', allShipmentsRes.body.data?.total);

  const shipAudit = await AuditLog.findOne({ resourceType: 'Shipment' });
  console.log('[TEST 8] Shipment AuditLog record found:', !!shipAudit);

  if (allShipmentsRes.status === 200 && allShipmentsRes.body.data?.total >= 2 && shipAudit) {
    console.log('✅ TEST 8 PASSED: Admin shipments overview returns records with full audit trail.\n');
  } else {
    console.error('❌ TEST 8 FAILED'); process.exit(1);
  }

  console.log('🎉 ALL 8 MODULE 24 DELIVERY INTEGRATION VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runDeliveryTests().catch((err) => {
  console.error('FATAL DELIVERY TEST ERROR:', err);
  process.exit(1);
});
