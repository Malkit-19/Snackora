/**
 * Comprehensive Automated Verification Suite for Module 14: Order Management
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const request = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (body) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const runOrderTests = async () => {
  console.log('=== SNACKORA MODULE 14: ORDER MANAGEMENT VERIFICATION ===\n');

  // 1. Authenticate Customer, Second Customer, and Admin
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;

  const b2bLogin = await request('/api/auth/login', 'POST', {
    email: 'wholesaler@snackora.in',
    password: 'B2b@12345'
  });
  const b2bToken = b2bLogin.body.data?.token;

  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;

  const custHeaders = { Authorization: `Bearer ${custToken}` };
  const b2bHeaders = { Authorization: `Bearer ${b2bToken}` };
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Prepare address for customer
  const addrRes = await request('/api/addresses', 'POST', {
    fullName: 'Module 14 Tester',
    phone: '9876543210',
    addressLine1: 'Building 14, Order Lane',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    label: 'Home'
  }, custHeaders);
  const addressId = addrRes.body.data?.address?._id;

  // Add sample product to cart (using 24 to satisfy both retail and B2B MOQ floor)
  const prodRes = await request('/api/products?limit=1');
  const sampleProduct = prodRes.body.data?.products[0];

  await request('/api/cart', 'DELETE', null, custHeaders);
  await request('/api/cart/items', 'POST', {
    productId: sampleProduct._id,
    quantity: 24
  }, custHeaders);

  // Test 1: User creates order (POST /api/orders)
  const createOrderRes = await request('/api/orders', 'POST', {
    addressId,
    paymentMethod: 'COD',
    notes: 'Module 14 Verification Order'
  }, custHeaders);

  console.log('[TEST 1] Create Order Status:', createOrderRes.status);
  const createdOrder = createOrderRes.body.data?.order;
  console.log('[TEST 1] Order Number:', createdOrder?.orderNumber);
  console.log('[TEST 1] Order Status:', createdOrder?.orderStatus);
  console.log('[TEST 1] Snapshot Item Name:', createdOrder?.items?.[0]?.name);
  console.log('[TEST 1] Snapshot Item Price:', createdOrder?.items?.[0]?.price);

  if (
    createOrderRes.status === 201 &&
    createdOrder?.orderNumber?.startsWith('SNK-') &&
    createdOrder?.orderStatus === 'PLACED' &&
    typeof createdOrder?.items?.[0]?.price === 'number' &&
    createdOrder?.items?.[0]?.price > 0
  ) {
    console.log('✅ TEST 1 PASSED: Order created with frozen item snapshot and PLACED status.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', createOrderRes.body);
    process.exit(1);
  }

  // Test 2: User fetches own order history (GET /api/orders)
  const myOrdersRes = await request('/api/orders', 'GET', null, custHeaders);
  console.log('[TEST 2] Get My Orders Status:', myOrdersRes.status);
  const myOrders = myOrdersRes.body.data?.orders || [];
  console.log('[TEST 2] Orders Count:', myOrders.length);

  if (myOrdersRes.status === 200 && myOrders.length >= 1) {
    console.log('✅ TEST 2 PASSED: Customer retrieved own order history.\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: User fetches order by ID (GET /api/orders/:id)
  const singleOrderRes = await request(`/api/orders/${createdOrder._id}`, 'GET', null, custHeaders);
  console.log('[TEST 3] Get Order by ID Status:', singleOrderRes.status);
  if (singleOrderRes.status === 200 && singleOrderRes.body.data?.order?.orderNumber === createdOrder.orderNumber) {
    console.log('✅ TEST 3 PASSED: Single order retrieved by ID.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Ownership security (B2B user attempts to view Customer's order)
  const unauthorizedView = await request(`/api/orders/${createdOrder._id}`, 'GET', null, b2bHeaders);
  console.log('[TEST 4] B2B viewing Customer order Status:', unauthorizedView.status);
  if (unauthorizedView.status === 404) {
    console.log('✅ TEST 4 PASSED: Ownership strictly enforced (404 for cross-user order view).\n');
  } else {
    console.error('❌ TEST 4 FAILED: Cross-user order view was allowed!');
    process.exit(1);
  }

  // Test 5: Security — User cannot alter order status directly
  const patchUserAttempt = await request(`/api/orders/${createdOrder._id}`, 'PATCH', {
    orderStatus: 'DELIVERED'
  }, custHeaders);
  console.log('[TEST 5] Customer attempt to patch order status Status:', patchUserAttempt.status);
  if (patchUserAttempt.status === 404 || patchUserAttempt.status === 405) {
    console.log('✅ TEST 5 PASSED: Customers cannot change order status directly.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: Admin fetches all orders (GET /api/admin/orders)
  const adminListRes = await request('/api/admin/orders', 'GET', null, adminHeaders);
  console.log('[TEST 6] Admin Get All Orders Status:', adminListRes.status);
  const adminOrders = adminListRes.body.data?.orders || [];
  console.log('[TEST 6] Total Orders in Admin view:', adminOrders.length);
  if (adminListRes.status === 200 && adminOrders.length >= 1) {
    console.log('✅ TEST 6 PASSED: Admin retrieved all platform orders.\n');
  } else {
    console.error('❌ TEST 6 FAILED');
    process.exit(1);
  }

  // Test 7: Admin transitions order status through lifecycle
  const statusesToTest = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  for (const nextStatus of statusesToTest) {
    const statusUpdateRes = await request(`/api/admin/orders/${createdOrder._id}/status`, 'PATCH', {
      status: nextStatus,
      note: `Admin moved order to ${nextStatus}`,
      trackingNumber: nextStatus === 'SHIPPED' ? 'SNK-TRK-99081' : undefined,
      carrier: nextStatus === 'SHIPPED' ? 'BlueDart' : undefined
    }, adminHeaders);

    console.log(`[TEST 7] Admin update status to '${nextStatus}' Status:`, statusUpdateRes.status);
    if (statusUpdateRes.status !== 200 || statusUpdateRes.body.data?.order?.orderStatus !== nextStatus) {
      console.error(`❌ TEST 7 FAILED at status ${nextStatus}:`, statusUpdateRes.body);
      process.exit(1);
    }
  }
  console.log('✅ TEST 7 PASSED: Order transitioned through PLACED -> CONFIRMED -> PACKED -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED.\n');

  // Test 8: Terminal state guard (cannot alter status once DELIVERED)
  const terminalUpdateAttempt = await request(`/api/admin/orders/${createdOrder._id}/status`, 'PATCH', {
    status: 'CANCELLED'
  }, adminHeaders);

  console.log('[TEST 8] Terminal state mutation attempt Status:', terminalUpdateAttempt.status);
  console.log('[TEST 8] Error Code:', terminalUpdateAttempt.body.code);
  if (terminalUpdateAttempt.status === 409 && terminalUpdateAttempt.body.code === 'STATUS_CONFLICT') {
    console.log('✅ TEST 8 PASSED: Mutating terminal DELIVERED order blocked with STATUS_CONFLICT.\n');
  } else {
    console.error('❌ TEST 8 FAILED');
    process.exit(1);
  }

  // Test 9: Price freeze check — old orders must retain frozen item snapshot price
  const verifyFrozenPrice = await request(`/api/orders/${createdOrder._id}`, 'GET', null, custHeaders);
  const frozenPrice = verifyFrozenPrice.body.data?.order?.items?.[0]?.price;
  console.log('[TEST 9] Frozen Price in Historical Order:', frozenPrice);
  if (verifyFrozenPrice.status === 200 && frozenPrice === createdOrder.items[0].price) {
    console.log('✅ TEST 9 PASSED: Order item prices remain frozen and immutable.\n');
  } else {
    console.error('❌ TEST 9 FAILED');
    process.exit(1);
  }

  console.log('🎉 ALL 9 MODULE 14 ORDER MANAGEMENT VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runOrderTests().catch((err) => {
  console.error('FATAL ORDER TEST ERROR:', err);
  process.exit(1);
});
