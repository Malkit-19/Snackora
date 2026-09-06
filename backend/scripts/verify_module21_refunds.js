/**
 * Comprehensive Automated Verification Suite for Module 21: Refund Management
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

const runRefundTests = async () => {
  console.log('=== SNACKORA MODULE 21: REFUND MANAGEMENT VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const User = require('../src/models/User');
  const Order = require('../src/models/Order');
  const Refund = require('../src/models/Refund');
  const Product = require('../src/models/Product');
  const InventoryTransaction = require('../src/models/InventoryTransaction');
  const Notification = require('../src/models/Notification');
  const EmailLog = require('../src/models/EmailLog');
  const AuditLog = require('../src/models/AuditLog');

  // 1. Authenticate Customer and Admin
  await User.updateOne({ email: 'customer@snackora.in' }, { role: 'CUSTOMER', b2bStatus: 'NONE' });

  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custUser = custLogin.body.data?.user;
  const custH = { Authorization: `Bearer ${custToken}` };

  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;
  const adminH = { Authorization: `Bearer ${adminToken}` };

  // 2. Setup a fresh delivered Order for refund testing
  let addrRes = await request('/api/addresses', 'GET', null, custH);
  let sampleAddress = addrRes.body.data?.addresses?.[0];

  const targetProduct = await Product.findOne({ isAvailable: true });
  const initialStock = targetProduct.stock;

  // Add to cart and place order
  await request('/api/cart/items', 'POST', { productId: String(targetProduct._id), quantity: 3 }, custH);
  const placeRes = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'COD'
  }, custH);

  const testOrder = placeRes.body.data?.order;
  console.log('[SETUP] Created test order for refund:', testOrder?.orderNumber);

  // ── TEST 1: Customer Create Refund Request ──────────────────────────────────
  const createRefundRes = await request('/api/refunds', 'POST', {
    orderId: testOrder._id,
    reason: 'Damaged',
    description: 'The package arrived torn and product seal was broken.',
    images: ['https://example.com/damaged-seal.jpg']
  }, custH);

  console.log('[TEST 1] Create Refund Status:', createRefundRes.status);
  const createdRefund = createRefundRes.body.data?.refund;
  console.log('[TEST 1] Refund ID:', createdRefund?._id);
  console.log('[TEST 1] Refund Reason:', createdRefund?.reason);
  console.log('[TEST 1] Refund Status:', createdRefund?.status);
  console.log('[TEST 1] Authoritative Amount:', createdRefund?.amount);

  if (
    createRefundRes.status === 201 &&
    createdRefund?.reason === 'Damaged' &&
    createdRefund?.status === 'REQUESTED' &&
    createdRefund?.amount === testOrder.pricing.total
  ) {
    console.log('✅ TEST 1 PASSED: Customer created refund request with authoritative amount & REQUESTED status.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', createRefundRes.body); process.exit(1);
  }

  // ── TEST 2: Duplicate Refund Request Guard ─────────────────────────────────
  const dupRefundRes = await request('/api/refunds', 'POST', {
    orderId: testOrder._id,
    reason: 'Wrong Product',
    description: 'Attempting duplicate refund request on same order.'
  }, custH);

  console.log('[TEST 2] Duplicate Refund Status:', dupRefundRes.status);
  console.log('[TEST 2] Error Code:', dupRefundRes.body.code);

  if (dupRefundRes.status === 409 && dupRefundRes.body.code === 'DUPLICATE_REFUND_REQUEST') {
    console.log('✅ TEST 2 PASSED: Duplicate refund request on same active order strictly blocked.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // ── TEST 3: Customer Refund List & Single Detail ────────────────────────────
  const listRes = await request('/api/refunds', 'GET', null, custH);
  console.log('[TEST 3] Customer Refunds List Status:', listRes.status);
  const userRefunds = listRes.body.data?.refunds || [];
  console.log('[TEST 3] Refunds returned for user:', userRefunds.length);

  const detailRes = await request(`/api/refunds/${createdRefund._id}`, 'GET', null, custH);
  console.log('[TEST 3] Single Refund Detail Status:', detailRes.status);
  console.log('[TEST 3] Populated Order Number in Detail:', detailRes.body.data?.refund?.order?.orderNumber);

  if (listRes.status === 200 && detailRes.status === 200 && userRefunds.length >= 1) {
    console.log('✅ TEST 3 PASSED: Customer refund listing and detail view working correctly.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── TEST 4: Admin Refunds Overview & Metrics ────────────────────────────────
  const adminOverviewRes = await request('/api/admin/refunds', 'GET', null, adminH);
  console.log('[TEST 4] Admin Refunds Overview Status:', adminOverviewRes.status);
  const allRefunds = adminOverviewRes.body.data?.refunds || [];
  const summary = adminOverviewRes.body.data?.summary;
  console.log('[TEST 4] Total refunds in admin view:', allRefunds.length);
  console.log('[TEST 4] Summary metrics:', JSON.stringify(summary));

  if (adminOverviewRes.status === 200 && allRefunds.length >= 1 && summary?.REQUESTED >= 1) {
    console.log('✅ TEST 4 PASSED: Admin overview returns all platform refund requests and status counters.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: Admin Review & Status Transitions ─────────────────────────────
  // 5a. UNDER_REVIEW
  const reviewRes = await request(`/api/admin/refunds/${createdRefund._id}`, 'PATCH', {
    status: 'UNDER_REVIEW',
    adminNotes: 'Assigned to logistics team for verification.'
  }, adminH);

  console.log('[TEST 5a] Status UNDER_REVIEW update:', reviewRes.status);
  console.log('[TEST 5a] New status:', reviewRes.body.data?.refund?.status);

  // 5b. APPROVED with Restock
  const approveRes = await request(`/api/admin/refunds/${createdRefund._id}`, 'PATCH', {
    status: 'APPROVED',
    adminNotes: 'Damaged item confirmed and return accepted.',
    restockToInventory: true
  }, adminH);

  console.log('[TEST 5b] Status APPROVED update:', approveRes.status);
  console.log('[TEST 5b] Restock approved flag:', approveRes.body.data?.refund?.restockApproved);

  if (
    reviewRes.status === 200 &&
    reviewRes.body.data?.refund?.status === 'UNDER_REVIEW' &&
    approveRes.status === 200 &&
    approveRes.body.data?.refund?.status === 'APPROVED' &&
    approveRes.body.data?.refund?.restockApproved === true
  ) {
    console.log('✅ TEST 5 PASSED: Admin updated refund status from REQUESTED → UNDER_REVIEW → APPROVED.\n');
  } else {
    console.error('❌ TEST 5 FAILED'); process.exit(1);
  }

  // ── TEST 6: Inventory Restock & Audit Ledger Verification ──────────────────
  const updatedProduct = await Product.findById(targetProduct._id);
  console.log(`[TEST 6] Product Stock: initial=${initialStock}, after restock=${updatedProduct.stock}`);

  const returnTx = await InventoryTransaction.findOne({
    reference: testOrder.orderNumber,
    type: 'ORDER_RETURNED'
  });
  console.log('[TEST 6] Inventory ledger ORDER_RETURNED created:', !!returnTx);
  console.log('[TEST 6] Restocked units:', returnTx?.quantity);

  if (returnTx && returnTx.quantity === 3) {
    console.log('✅ TEST 6 PASSED: Returned items successfully restocked into inventory ledger (ORDER_RETURNED).\n');
  } else {
    console.error('❌ TEST 6 FAILED: Inventory return transaction missing'); process.exit(1);
  }

  // ── TEST 7: Refund Completion (REFUNDED) ──────────────────────────────────
  const completeRes = await request(`/api/admin/refunds/${createdRefund._id}`, 'PATCH', {
    status: 'REFUNDED',
    adminNotes: 'Payout processed to customer.'
  }, adminH);

  console.log('[TEST 7] Status REFUNDED update:', completeRes.status);
  console.log('[TEST 7] Final Refund status:', completeRes.body.data?.refund?.status);

  const finalOrder = await Order.findById(testOrder._id);
  console.log('[TEST 7] Final Order status:', finalOrder.orderStatus);
  console.log('[TEST 7] Final Order paymentStatus:', finalOrder.paymentStatus);

  if (
    completeRes.status === 200 &&
    completeRes.body.data?.refund?.status === 'REFUNDED' &&
    finalOrder.orderStatus === 'REFUNDED' &&
    finalOrder.paymentStatus === 'REFUNDED'
  ) {
    console.log('✅ TEST 7 PASSED: Final refund marked REFUNDED. Order and Payment updated accordingly.\n');
  } else {
    console.error('❌ TEST 7 FAILED'); process.exit(1);
  }

  // ── TEST 8: Email, Notification & Audit Log Verification ───────────────────
  const notif = await Notification.findOne({
    user: custUser._id,
    type: 'REFUND'
  }).sort({ createdAt: -1 });

  const emailLog = await EmailLog.findOne({
    userId: custUser._id,
    templateType: 'REFUND_UPDATE'
  }).sort({ createdAt: -1 });

  const auditLog = await AuditLog.findOne({
    resourceType: 'Refund',
    resourceId: String(createdRefund._id)
  }).sort({ createdAt: -1 });

  console.log('[TEST 8] Refund in-app notification created:', !!notif);
  console.log('[TEST 8] Refund email log saved:', !!emailLog);
  console.log('[TEST 8] Refund audit log saved:', !!auditLog);

  if (notif && emailLog && auditLog) {
    console.log('✅ TEST 8 PASSED: Customer notifications, transactional emails, and audit logs dispatched.\n');
  } else {
    console.error('❌ TEST 8 FAILED: Notification/Email/AuditLog missing'); process.exit(1);
  }

  console.log('🎉 ALL 8 MODULE 21 REFUND MANAGEMENT VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runRefundTests().catch((err) => {
  console.error('FATAL REFUND TEST ERROR:', err);
  process.exit(1);
});
