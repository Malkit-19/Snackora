/**
 * Comprehensive Automated Verification Suite for Module 12: Cart System
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

const runCartTests = async () => {
  console.log('=== SNACKORA MODULE 12: CART SYSTEM VERIFICATION ===\n');

  // Ensure DB connection to reset customer role for test idempotency
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  }
  const User = require('../src/models/User');
  await User.findOneAndUpdate({ email: 'customer@snackora.in' }, { role: 'CUSTOMER', b2bStatus: 'NONE' });

  // Authenticate Customer and Approved B2B Wholesaler
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

  // Fetch sample product
  const prodRes = await request('/api/products?limit=2');
  const sampleProduct = prodRes.body.data?.products[0];
  console.log(`Using sample product: '${sampleProduct.name}' (Retail: ₹${sampleProduct.retailPrice}, Stock: ${sampleProduct.stock})`);

  // Test 1: Unauthenticated GET /api/cart -> 401
  const unauthGet = await request('/api/cart');
  console.log('[TEST 1] Unauthenticated GET /api/cart Status:', unauthGet.status);
  if (unauthGet.status === 401 && unauthGet.body.code === 'UNAUTHENTICATED') {
    console.log('✅ TEST 1 PASSED: Unauthenticated cart access blocked.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Clear customer cart before testing
  await request('/api/cart', 'DELETE', null, { Authorization: `Bearer ${custToken}` });

  // Test 2: Add item to cart (Customer - Retail Price)
  const addRes = await request('/api/cart/items', 'POST', {
    productId: sampleProduct._id,
    quantity: 2
  }, { Authorization: `Bearer ${custToken}` });

  console.log('[TEST 2] Add to Cart Status:', addRes.status);
  const cartData = addRes.body.data?.cart;
  const addedItem = cartData?.items?.[0];
  console.log('[TEST 2] Item Unit Price:', addedItem?.unitPrice);
  console.log('[TEST 2] Subtotal:', cartData?.summary?.subtotal);
  console.log('[TEST 2] Estimated Total:', cartData?.summary?.total);

  if (
    addRes.status === 201 &&
    addedItem?.quantity === 2 &&
    addedItem?.unitPrice === sampleProduct.retailPrice &&
    cartData?.summary?.subtotal === sampleProduct.retailPrice * 2
  ) {
    console.log('✅ TEST 2 PASSED: Item added with authoritative retail pricing & summary.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', addRes.body);
    process.exit(1);
  }

  // Test 3: Increase item quantity (PATCH /api/cart/items/:id)
  const patchRes = await request(`/api/cart/items/${addedItem._id}`, 'PATCH', {
    quantity: 3
  }, { Authorization: `Bearer ${custToken}` });

  console.log('[TEST 3] Increase Quantity Status:', patchRes.status);
  console.log('[TEST 3] New Quantity:', patchRes.body.data?.cart?.items?.[0]?.quantity);
  console.log('[TEST 3] New Subtotal:', patchRes.body.data?.cart?.summary?.subtotal);

  if (
    patchRes.status === 200 &&
    patchRes.body.data?.cart?.items?.[0]?.quantity === 3 &&
    patchRes.body.data?.cart?.summary?.subtotal === sampleProduct.retailPrice * 3
  ) {
    console.log('✅ TEST 3 PASSED: Quantity increased and totals recalculated.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Decrease item quantity (PATCH /api/cart/items/:id)
  const decRes = await request(`/api/cart/items/${addedItem._id}`, 'PATCH', {
    quantity: 1
  }, { Authorization: `Bearer ${custToken}` });

  console.log('[TEST 4] Decrease Quantity Status:', decRes.status);
  if (decRes.status === 200 && decRes.body.data?.cart?.items?.[0]?.quantity === 1) {
    console.log('✅ TEST 4 PASSED: Quantity decreased successfully.\n');
  } else {
    console.error('❌ TEST 4 FAILED');
    process.exit(1);
  }

  // Test 5: Out of stock limit validation
  const overStockRes = await request('/api/cart/items', 'POST', {
    productId: sampleProduct._id,
    quantity: sampleProduct.stock + 1000
  }, { Authorization: `Bearer ${custToken}` });

  console.log('[TEST 5] Exceed Stock Attempt Status:', overStockRes.status);
  console.log('[TEST 5] Error Code:', overStockRes.body.code);
  if (overStockRes.status === 400 && overStockRes.body.code === 'INSUFFICIENT_STOCK') {
    console.log('✅ TEST 5 PASSED: Exceeding stock properly blocked with INSUFFICIENT_STOCK.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: B2B Wholesale Pricing & MOQ Enforcement
  await request('/api/cart', 'DELETE', null, { Authorization: `Bearer ${b2bToken}` });

  // 6A: Attempt to add below MOQ (e.g. qty 2 when MOQ is 24) -> 400 MOQ_VIOLATION
  const b2bLowMoq = await request('/api/cart/items', 'POST', {
    productId: sampleProduct._id,
    quantity: 2
  }, { Authorization: `Bearer ${b2bToken}` });

  console.log('[TEST 6A] B2B Sub-MOQ Attempt Status:', b2bLowMoq.status);
  console.log('[TEST 6A] B2B Sub-MOQ Error Code:', b2bLowMoq.body.code);

  // 6B: Add with valid MOQ (e.g. qty 24)
  const b2bValid = await request('/api/cart/items', 'POST', {
    productId: sampleProduct._id,
    quantity: 24
  }, { Authorization: `Bearer ${b2bToken}` });

  console.log('[TEST 6B] B2B Valid MOQ Status:', b2bValid.status);
  const b2bItem = b2bValid.body.data?.cart?.items?.[0];
  console.log('[TEST 6B] B2B Item Wholesale Price:', b2bItem?.unitPrice);
  console.log('[TEST 6B] Is Wholesale View:', b2bValid.body.data?.cart?.summary?.isWholesaleView);

  if (
    b2bLowMoq.status === 400 &&
    b2bLowMoq.body.code === 'MOQ_VIOLATION' &&
    b2bValid.status === 201 &&
    b2bItem?.isWholesale === true
  ) {
    console.log('✅ TEST 6 PASSED: B2B wholesale pricing applied and MOQ strictly enforced.\n');
  } else {
    console.error('❌ TEST 6 FAILED');
    process.exit(1);
  }

  // Test 7: Remove specific item from cart
  const remRes = await request(`/api/cart/items/${addedItem._id}`, 'DELETE', null, { Authorization: `Bearer ${custToken}` });
  console.log('[TEST 7] Remove Item Status:', remRes.status);
  console.log('[TEST 7] Remaining items in customer cart:', remRes.body.data?.cart?.items?.length);
  if (remRes.status === 200 && remRes.body.data?.cart?.items?.length === 0) {
    console.log('✅ TEST 7 PASSED: Item removed from cart.\n');
  } else {
    console.error('❌ TEST 7 FAILED');
    process.exit(1);
  }

  // Test 8: Clear entire cart (DELETE /api/cart)
  const clearRes = await request('/api/cart', 'DELETE', null, { Authorization: `Bearer ${b2bToken}` });
  console.log('[TEST 8] Clear Cart Status:', clearRes.status);
  console.log('[TEST 8] B2B cart items count after clear:', clearRes.body.data?.cart?.items?.length);
  if (clearRes.status === 200 && clearRes.body.data?.cart?.items?.length === 0) {
    console.log('✅ TEST 8 PASSED: Entire cart cleared successfully.\n');
  } else {
    console.error('❌ TEST 8 FAILED');
    process.exit(1);
  }

  console.log('🎉 ALL 8 CART SYSTEM VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runCartTests().catch((err) => {
  console.error('FATAL CART TEST ERROR:', err);
  process.exit(1);
});
