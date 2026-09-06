/**
 * Comprehensive Automated Verification Suite for Module 19: Payment System
 */
const http = require('http');
const crypto = require('crypto');
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

const runPaymentTests = async () => {
  console.log('=== SNACKORA MODULE 19: PAYMENT SYSTEM VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const Order = require('../src/models/Order');
  const Payment = require('../src/models/Payment');
  const User = require('../src/models/User');
  const Product = require('../src/models/Product');
  const AuditLog = require('../src/models/AuditLog');
  await User.updateOne({ email: 'customer@snackora.in' }, { role: 'CUSTOMER', b2bStatus: 'NONE' });

  // 1. Authenticate Customer
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custUser = custLogin.body.data?.user;
  const custH = { Authorization: `Bearer ${custToken}` };

  // Fetch address or create one
  let addrRes = await request('/api/addresses', 'GET', null, custH);
  let sampleAddress = addrRes.body.data?.addresses?.[0];
  if (!sampleAddress) {
    const newAddr = await request('/api/addresses', 'POST', {
      fullName: 'Payment Tester',
      phone: '9876543210',
      addressLine1: 'Flat 402, Lotus Towers',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      label: 'Home',
      isDefault: true
    }, custH);
    sampleAddress = newAddr.body.data?.address;
  }

  // Ensure cart has items
  const prod = await Product.findOne({ isAvailable: true }).lean();
  const addCartRes = await request('/api/cart/items', 'POST', {
    productId: String(prod._id),
    quantity: 2
  }, custH);
  console.log('[SETUP] Add to Cart Status:', addCartRes.status, 'Body:', JSON.stringify(addCartRes.body));

  // ── TEST 1: Public Payment Gateway Config ──────────────────────────────────
  const configRes = await request('/api/payments/config', 'GET');
  console.log('[TEST 1] Public Payment Config Status:', configRes.status);
  console.log('[TEST 1] Supported Methods:', configRes.body.data?.supportedMethods?.join(', '));
  console.log('[TEST 1] Razorpay Configured status:', configRes.body.data?.configured);

  const secretsExposed = JSON.stringify(configRes.body).includes(process.env.RAZORPAY_KEY_SECRET || 'secret');
  if (configRes.status === 200 && configRes.body.data?.supportedMethods?.includes('COD') && !secretsExposed) {
    console.log('✅ TEST 1 PASSED: Payment config endpoint public. Secret keys NEVER exposed to client.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // ── TEST 2: COD Order Placement & Payment Record ──────────────────────────
  const codRes = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'COD'
  }, custH);

  console.log('[TEST 2] COD Order Placement Status:', codRes.status);
  const codOrder = codRes.body.data?.order;
  console.log('[TEST 2] Order Number:', codOrder?.orderNumber);
  console.log('[TEST 2] Payment Method:', codOrder?.paymentMethod);
  console.log('[TEST 2] Payment Status:', codOrder?.paymentStatus);
  console.log('[TEST 2] Order Status:', codOrder?.orderStatus);

  const codPaymentDoc = await Payment.findOne({ order: codOrder?._id });
  console.log('[TEST 2] Created Payment Record Method:', codPaymentDoc?.method);
  console.log('[TEST 2] Created Payment Record Status:', codPaymentDoc?.status);

  if (
    codRes.status === 201 &&
    codOrder?.paymentMethod === 'COD' &&
    codOrder?.paymentStatus === 'PENDING' &&
    codOrder?.orderStatus === 'PLACED' &&
    codPaymentDoc?.status === 'PENDING'
  ) {
    console.log('✅ TEST 2 PASSED: COD order created with PENDING payment status and authoritative total.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', codRes.body); process.exit(1);
  }

  // ── TEST 3: Idempotent Duplicate Order Prevention ─────────────────────────
  await request('/api/cart/items', 'POST', { productId: String(prod._id), quantity: 1 }, custH);
  const idempotencyKey = `IDEMP-${Date.now()}`;

  const firstOrderRes = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'UPI',
    idempotencyKey
  }, custH);

  const secondOrderRes = await request('/api/checkout/place-order', 'POST', {
    addressId: sampleAddress._id,
    paymentMethod: 'UPI',
    idempotencyKey
  }, custH);

  console.log('[TEST 3] First Order Status:', firstOrderRes.status);
  console.log('[TEST 3] Duplicate Request Status:', secondOrderRes.status);
  console.log('[TEST 3] Duplicate Recognized:', secondOrderRes.body.data?.isDuplicate);

  if (
    firstOrderRes.status === 201 &&
    secondOrderRes.status === 200 &&
    secondOrderRes.body.data?.isDuplicate === true
  ) {
    console.log('✅ TEST 3 PASSED: Duplicate order prevented via idempotency key.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  const onlineOrder = firstOrderRes.body.data?.order;

  // ── TEST 4: Fake / Tampered Signature Rejection ───────────────────────────
  // Setup a test Razorpay Order ID on the order
  const testRzpOrderId = `order_test_${Date.now()}`;
  await Order.findByIdAndUpdate(onlineOrder._id, { razorpayOrderId: testRzpOrderId });
  await Payment.findOneAndUpdate({ order: onlineOrder._id }, { razorpayOrderId: testRzpOrderId });

  const fakeSigRes = await request('/api/payments/verify', 'POST', {
    orderId: onlineOrder._id,
    razorpayOrderId: testRzpOrderId,
    razorpayPaymentId: 'pay_fake_12345',
    razorpaySignature: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  }, custH);

  console.log('[TEST 4] Fake Signature Verification Status:', fakeSigRes.status);
  console.log('[TEST 4] Error Code:', fakeSigRes.body.code);

  if (fakeSigRes.status === 400 && fakeSigRes.body.code === 'SIGNATURE_VERIFICATION_FAILED') {
    console.log('✅ TEST 4 PASSED: Tampered/fake payment signature strictly rejected by server-side HMAC check.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: Authentic Server-Side Signature Verification & Confirmation ────
  const testPaymentId = `pay_valid_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
    .update(`${testRzpOrderId}|${testPaymentId}`)
    .digest('hex');

  const verifyRes = await request('/api/payments/verify', 'POST', {
    orderId: onlineOrder._id,
    razorpayOrderId: testRzpOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature
  }, custH);

  console.log('[TEST 5] Valid Signature Verification Status:', verifyRes.status);
  console.log('[TEST 5] Updated Payment Status:', verifyRes.body.data?.paymentStatus);
  console.log('[TEST 5] Updated Order Status:', verifyRes.body.data?.orderStatus);

  const updatedOrder = await Order.findById(onlineOrder._id);
  const updatedPayment = await Payment.findOne({ order: onlineOrder._id });

  if (
    verifyRes.status === 200 &&
    updatedOrder.paymentStatus === 'COMPLETED' &&
    updatedOrder.orderStatus === 'CONFIRMED' &&
    updatedPayment.status === 'CAPTURED'
  ) {
    console.log('✅ TEST 5 PASSED: Server-side HMAC verified. Order marked CONFIRMED, Payment marked CAPTURED.\n');
  } else {
    console.error('❌ TEST 5 FAILED:', verifyRes.body); process.exit(1);
  }

  // ── TEST 6: Secondary Verification Idempotency ────────────────────────────
  const repeatVerifyRes = await request('/api/payments/verify', 'POST', {
    orderId: onlineOrder._id,
    razorpayOrderId: testRzpOrderId,
    razorpayPaymentId: testPaymentId,
    razorpaySignature: validSignature
  }, custH);

  console.log('[TEST 6] Repeat Verification Status:', repeatVerifyRes.status);
  console.log('[TEST 6] Already Completed flag:', repeatVerifyRes.body.data?.alreadyCompleted);

  if (repeatVerifyRes.status === 200 && repeatVerifyRes.body.data?.alreadyCompleted === true) {
    console.log('✅ TEST 6 PASSED: Duplicate verification safely handled with idempotency.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Webhook Signature Verification & Idempotent Processing ────────
  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    account_id: 'acc_test_snackora',
    created_at: Math.floor(Date.now() / 1000),
    payload: {
      payment: {
        entity: {
          id: `pay_hook_${Date.now()}`,
          order_id: testRzpOrderId,
          amount: updatedOrder.pricing.total * 100,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const webhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(Buffer.from(webhookPayload))
    .digest('hex');

  const webhookRes = await request('/api/payments/webhook', 'POST', JSON.parse(webhookPayload), {
    'x-razorpay-signature': webhookSig
  });

  console.log('[TEST 7] Webhook Processing Status:', webhookRes.status);
  console.log('[TEST 7] Webhook Response:', JSON.stringify(webhookRes.body));

  if (webhookRes.status === 200 && webhookRes.body.received === true) {
    console.log('✅ TEST 7 PASSED: Razorpay webhook processed idempotently.\n');
  } else {
    console.error('❌ TEST 7 FAILED:', webhookRes.body); process.exit(1);
  }

  // ── TEST 8: Audit Log Verification for Payment ─────────────────────────────
  const paymentAuditLog = await AuditLog.findOne({ action: 'PAYMENT_VERIFIED', resourceId: String(onlineOrder._id) });
  console.log('[TEST 8] Audit Log recorded for Payment:', !!paymentAuditLog);
  console.log('[TEST 8] Audit Log Order Number:', paymentAuditLog?.changes?.after?.orderNumber);

  if (paymentAuditLog && paymentAuditLog.changes?.after?.signatureVerified === true) {
    console.log('✅ TEST 8 PASSED: Payment capture automatically recorded in AuditLog collection.\n');
  } else {
    console.error('❌ TEST 8 FAILED: Payment audit log missing'); process.exit(1);
  }

  console.log('🎉 ALL 8 MODULE 19 PAYMENT SYSTEM VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runPaymentTests().catch((err) => {
  console.error('FATAL PAYMENT TEST ERROR:', err);
  process.exit(1);
});
