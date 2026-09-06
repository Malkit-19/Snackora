/**
 * Comprehensive Automated Verification Suite for Module 20: Email + Notification System
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

const runNotificationTests = async () => {
  console.log('=== SNACKORA MODULE 20: EMAIL + NOTIFICATION SYSTEM VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const User = require('../src/models/User');
  const Notification = require('../src/models/Notification');
  const EmailLog = require('../src/models/EmailLog');
  const emailService = require('../src/services/emailService');
  const { createInAppNotification } = require('../src/controllers/notificationController');

  // 1. Authenticate Customer
  await User.updateOne({ email: 'customer@snackora.in' }, { role: 'CUSTOMER', b2bStatus: 'NONE' });
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custUser = custLogin.body.data?.user;
  const custH = { Authorization: `Bearer ${custToken}` };

  // Clear previous test notifications for clean testing
  await Notification.deleteMany({ user: custUser._id });

  // ── TEST 1: In-App Notification Creation across all 6 types ────────────────
  const notificationTypes = ['ORDER', 'PAYMENT', 'REFUND', 'B2B', 'PROMOTION', 'SYSTEM'];
  for (const type of notificationTypes) {
    await createInAppNotification({
      userId: custUser._id,
      type,
      title: `Test ${type} Notification`,
      message: `This is a test notification for type ${type}.`,
      link: '/shop'
    });
  }

  const listRes = await request('/api/notifications', 'GET', null, custH);
  console.log('[TEST 1] List Notifications Status:', listRes.status);
  const notifs = listRes.body.data?.notifications || [];
  const unreadCount = listRes.body.data?.unreadCount;
  console.log('[TEST 1] Notifications returned:', notifs.length);
  console.log('[TEST 1] Unread Count:', unreadCount);

  if (listRes.status === 200 && notifs.length === 6 && unreadCount === 6) {
    console.log('✅ TEST 1 PASSED: In-app notifications created across all types with correct unread count.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', listRes.body); process.exit(1);
  }

  // ── TEST 2: Mark Single Notification as Read ──────────────────────────────
  const sampleNotif = notifs[0];
  const readSingleRes = await request(`/api/notifications/${sampleNotif._id}/read`, 'PATCH', null, custH);
  console.log('[TEST 2] Mark Single Read Status:', readSingleRes.status);
  console.log('[TEST 2] Updated Read Status:', readSingleRes.body.data?.notification?.read);
  console.log('[TEST 2] Remaining Unread Count:', readSingleRes.body.data?.unreadCount);

  if (
    readSingleRes.status === 200 &&
    readSingleRes.body.data?.notification?.read === true &&
    readSingleRes.body.data?.unreadCount === 5
  ) {
    console.log('✅ TEST 2 PASSED: Single notification marked as read and unread counter decremented.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // ── TEST 3: Mark All Notifications as Read ────────────────────────────────
  const readAllRes = await request('/api/notifications/read-all', 'PATCH', null, custH);
  console.log('[TEST 3] Mark All Read Status:', readAllRes.status);
  console.log('[TEST 3] Marked Count:', readAllRes.body.data?.markedCount);
  console.log('[TEST 3] Unread Count:', readAllRes.body.data?.unreadCount);

  const checkUnreadRes = await request('/api/notifications', 'GET', null, custH);
  if (
    readAllRes.status === 200 &&
    readAllRes.body.data?.unreadCount === 0 &&
    checkUnreadRes.body.data?.unreadCount === 0
  ) {
    console.log('✅ TEST 3 PASSED: All notifications marked as read; unread count set to 0.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── TEST 4: Type Filtering ────────────────────────────────────────────────
  const orderFilterRes = await request('/api/notifications?type=ORDER', 'GET', null, custH);
  console.log('[TEST 4] Filter by type=ORDER Status:', orderFilterRes.status);
  const orderNotifs = orderFilterRes.body.data?.notifications || [];
  console.log('[TEST 4] ORDER notifications count:', orderNotifs.length);

  if (orderFilterRes.status === 200 && orderNotifs.every((n) => n.type === 'ORDER')) {
    console.log('✅ TEST 4 PASSED: Notification type filtering functions accurately.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: 10 Transactional Email Dispatchers ────────────────────────────
  const mockUser = {
    _id: custUser._id,
    name: 'Customer Test',
    email: 'customer@snackora.in'
  };
  const mockOrder = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: 'SNK-TEST-EMAIL-01',
    items: [{ name: 'Butter Cookies', quantity: 2 }],
    pricing: { total: 499 },
    paymentMethod: 'UPI',
    paymentStatus: 'COMPLETED'
  };

  const emailResults = await Promise.all([
    emailService.sendRegistrationEmail({ user: mockUser }),
    emailService.sendOrderConfirmationEmail({ user: mockUser, order: mockOrder }),
    emailService.sendPaymentSuccessEmail({ user: mockUser, order: mockOrder, paymentId: 'pay_123' }),
    emailService.sendPaymentFailureEmail({ user: mockUser, order: mockOrder, errorReason: 'Card Declined' }),
    emailService.sendOrderShippedEmail({ user: mockUser, order: mockOrder, trackingNumber: 'TRK999', carrier: 'BlueDart' }),
    emailService.sendOrderDeliveredEmail({ user: mockUser, order: mockOrder }),
    emailService.sendRefundUpdateEmail({ user: mockUser, order: mockOrder, refundAmount: 499, status: 'PROCESSED' }),
    emailService.sendB2BApprovalEmail({ user: mockUser, businessName: 'Snack Retail Ltd' }),
    emailService.sendB2BRejectionEmail({ user: mockUser, reason: 'Incomplete GST' }),
    emailService.sendPasswordResetEmail({ user: mockUser, resetUrl: 'http://localhost:5173/reset-password' })
  ]);

  console.log('[TEST 5] 10 Email templates dispatched:', emailResults.map(r => r.success).join(', '));
  const allSent = emailResults.every(r => r.success === true);

  if (allSent) {
    console.log('✅ TEST 5 PASSED: All 10 transactional email templates generated and dispatched successfully.\n');
  } else {
    console.error('❌ TEST 5 FAILED'); process.exit(1);
  }

  // ── TEST 6: EmailLog Persistence in MongoDB ────────────────────────────────
  const logsCount = await EmailLog.countDocuments({ userId: custUser._id });
  console.log('[TEST 6] EmailLog records saved in MongoDB:', logsCount);
  const sampleLog = await EmailLog.findOne({ userId: custUser._id }).sort({ createdAt: -1 });
  console.log('[TEST 6] Sample Log Template Type:', sampleLog?.templateType);
  console.log('[TEST 6] Sample Log Status:', sampleLog?.status);

  if (logsCount >= 10 && sampleLog?.status === 'SENT') {
    console.log('✅ TEST 6 PASSED: Transactional emails logged to EmailLog collection.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Email Failure Non-Blocking Resilience ─────────────────────────
  // Intentionally call email with non-fatal logging to ensure caller is NEVER disrupted
  const fakeErrorRes = await emailService.sendEmail({
    to: '', // invalid recipient to trigger error handling
    userId: custUser._id,
    subject: 'Fault Tolerance Test',
    html: '<p>Test</p>',
    templateType: 'FAULT_TEST'
  });

  console.log('[TEST 7] Fault tolerance handled safely:', fakeErrorRes.success === false);
  const failureLog = await EmailLog.findOne({ templateType: 'FAULT_TEST' });
  console.log('[TEST 7] Failure logged in MongoDB:', !!failureLog);
  console.log('[TEST 7] Logged Error Message:', failureLog?.error || 'Handled');

  if (fakeErrorRes.success === false && failureLog) {
    console.log('✅ TEST 7 PASSED: Email failures handled non-blockingly and recorded for admin retry.\n');
  } else {
    console.error('❌ TEST 7 FAILED'); process.exit(1);
  }

  // ── TEST 8: Web Push Configuration & Subscription ──────────────────────────
  const pushConfigRes = await request('/api/notifications/push-config', 'GET');
  console.log('[TEST 8] Push Config Status:', pushConfigRes.status);
  console.log('[TEST 8] Push Enabled:', pushConfigRes.body.data?.enabled);

  const subPushRes = await request('/api/notifications/subscribe-push', 'POST', {
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-token',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' }
    }
  }, custH);

  console.log('[TEST 8] Push Subscription Status:', subPushRes.status);
  console.log('[TEST 8] Subscribed Flag:', subPushRes.body.data?.subscribed);

  if (pushConfigRes.status === 200 && subPushRes.status === 200 && subPushRes.body.data?.subscribed === true) {
    console.log('✅ TEST 8 PASSED: Web Push configuration and subscription endpoints fully prepared.\n');
  } else {
    console.error('❌ TEST 8 FAILED'); process.exit(1);
  }

  console.log('🎉 ALL 8 MODULE 20 NOTIFICATION & EMAIL SYSTEM VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runNotificationTests().catch((err) => {
  console.error('FATAL NOTIFICATION TEST ERROR:', err);
  process.exit(1);
});
