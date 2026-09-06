/**
 * Module 13: Address + Checkout Verification Suite
 */
const http = require('http');
require('dotenv').config({ path: __dirname + '/../.env' });

const request = (path, method = 'GET', body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (postData) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });

const run = async () => {
  console.log('=== SNACKORA MODULE 13: ADDRESS + CHECKOUT VERIFICATION ===\n');

  // Authenticate customer
  const loginRes = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const token = loginRes.body.data?.token;
  const auth = { Authorization: `Bearer ${token}` };
  console.log('[SETUP] Customer authenticated:', !!token);

  // ── TEST 1: Unauthenticated address access blocked ──────────────────────────
  const unauthAddr = await request('/api/addresses');
  console.log('\n[TEST 1] Unauthenticated GET /api/addresses Status:', unauthAddr.status);
  if (unauthAddr.status === 401) {
    console.log('✅ TEST 1 PASSED: Unauthenticated address access blocked.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // Cleanup pre-existing addresses for clean idempotent state
  const existingList = await request('/api/addresses', 'GET', null, auth);
  if (existingList.body.data?.addresses) {
    for (const a of existingList.body.data.addresses) {
      await request(`/api/addresses/${a._id}`, 'DELETE', null, auth);
    }
  }

  // ── TEST 2: Add first address (should auto-become default) ─────────────────
  const addRes = await request('/api/addresses', 'POST', {
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    addressLine1: 'Flat 201, Andheri West',
    addressLine2: 'Near Station',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    label: 'Home',
    isDefault: false   // first address should auto-default even if false
  }, auth);

  console.log('[TEST 2] Add Address Status:', addRes.status);
  const addr1 = addRes.body.data?.address;
  console.log('[TEST 2] Address ID:', addr1?._id);
  console.log('[TEST 2] Is Default (auto):', addr1?.isDefault);
  if (addRes.status === 201 && addr1?.isDefault === true) {
    console.log('✅ TEST 2 PASSED: First address auto-set as default.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', addRes.body);
    process.exit(1);
  }

  // ── TEST 3: Add second address (non-default) ────────────────────────────────
  const addRes2 = await request('/api/addresses', 'POST', {
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    addressLine1: 'Office Block B, BKC',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400051',
    label: 'Office',
    isDefault: false
  }, auth);

  const addr2 = addRes2.body.data?.address;
  console.log('[TEST 3] Add Second Address Status:', addRes2.status);
  console.log('[TEST 3] Second Is Default:', addr2?.isDefault);
  if (addRes2.status === 201 && addr2?.isDefault === false) {
    console.log('✅ TEST 3 PASSED: Second address added without overriding default.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── TEST 4: Get all addresses (should be 2) ──────────────────────────────────
  const listRes = await request('/api/addresses', 'GET', null, auth);
  const addrList = listRes.body.data?.addresses || [];
  console.log('[TEST 4] List Addresses Count:', addrList.length);
  if (listRes.status === 200 && addrList.length >= 2) {
    console.log('✅ TEST 4 PASSED: Address list retrieved.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: Set address 2 as default ────────────────────────────────────────
  const setDefaultRes = await request(`/api/addresses/${addr2._id}/default`, 'PATCH', null, auth);
  console.log('[TEST 5] Set Default Status:', setDefaultRes.status);
  const updatedDefaultAddr = setDefaultRes.body.data?.address;

  // verify addr1 is no longer default
  const listAfterDefault = await request('/api/addresses', 'GET', null, auth);
  const addr1Updated = listAfterDefault.body.data?.addresses?.find(a => a._id === addr1._id);
  console.log('[TEST 5] addr2 isDefault:', updatedDefaultAddr?.isDefault);
  console.log('[TEST 5] addr1 isDefault after:', addr1Updated?.isDefault);

  if (setDefaultRes.status === 200 && updatedDefaultAddr?.isDefault === true && addr1Updated?.isDefault === false) {
    console.log('✅ TEST 5 PASSED: Default address toggled correctly, old default unset.\n');
  } else {
    console.error('❌ TEST 5 FAILED'); process.exit(1);
  }

  // ── TEST 6: Edit address ─────────────────────────────────────────────────────
  const editRes = await request(`/api/addresses/${addr1._id}`, 'PUT', {
    city: 'Pune',
    pincode: '411001',
    state: 'Maharashtra'
  }, auth);
  console.log('[TEST 6] Edit Address Status:', editRes.status);
  const editedAddr = editRes.body.data?.address;
  console.log('[TEST 6] Updated City:', editedAddr?.city);
  if (editRes.status === 200 && editedAddr?.city === 'Pune') {
    console.log('✅ TEST 6 PASSED: Address field updated.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Pincode validation on create ─────────────────────────────────────
  const invalidPin = await request('/api/addresses', 'POST', {
    fullName: 'Test User', phone: '9876543210',
    addressLine1: 'Some street', city: 'Delhi',
    state: 'Delhi', pincode: '12345'   // only 5 digits — invalid
  }, auth);
  console.log('[TEST 7] Invalid Pincode Status:', invalidPin.status);
  if (invalidPin.status === 400) {
    console.log('✅ TEST 7 PASSED: Invalid pincode rejected with 400.\n');
  } else {
    console.error('❌ TEST 7 FAILED'); process.exit(1);
  }

  // ── TEST 8: Checkout summary (backend recalculates) ──────────────────────────
  // First add an item to the cart
  const prodRes = await request('/api/products?limit=1');
  const prod = prodRes.body.data?.products?.[0];
  await request('/api/cart', 'DELETE', null, auth);
  await request('/api/cart/items', 'POST', { productId: prod._id, quantity: 2 }, auth);

  const summaryRes = await request('/api/checkout/summary', 'GET', null, auth);
  console.log('[TEST 8] Checkout Summary Status:', summaryRes.status);
  const pricing = summaryRes.body.data?.pricing;
  console.log('[TEST 8] Subtotal:', pricing?.subtotal);
  console.log('[TEST 8] Total:', pricing?.total);
  console.log('[TEST 8] Tax (5%):', pricing?.tax);
  if (
    summaryRes.status === 200 &&
    pricing?.subtotal === prod.retailPrice * 2 &&
    typeof pricing?.total === 'number' &&
    pricing?.total > 0
  ) {
    console.log('✅ TEST 8 PASSED: Checkout summary returns authoritative backend-calculated totals.\n');
  } else {
    console.error('❌ TEST 8 FAILED:', summaryRes.body);
    process.exit(1);
  }

  // ── TEST 9: Place order (COD) ─────────────────────────────────────────────────
  const orderRes = await request('/api/checkout/place-order', 'POST', {
    addressId: addr1._id,
    paymentMethod: 'COD',
    notes: 'Please ring doorbell twice.'
  }, auth);

  console.log('[TEST 9] Place Order Status:', orderRes.status);
  const order = orderRes.body.data?.order;
  console.log('[TEST 9] Order Number:', order?.orderNumber);
  console.log('[TEST 9] Order Total:', order?.pricing?.total);
  console.log('[TEST 9] Shipping City (snapshot):', order?.shippingAddress?.city);
  console.log('[TEST 9] Payment Method:', order?.paymentMethod);

  if (
    orderRes.status === 201 &&
    order?.orderNumber?.startsWith('SNK-') &&
    order?.pricing?.total === pricing?.total &&
    order?.shippingAddress?.city === editedAddr?.city &&  // immutable snapshot of edited city
    order?.paymentMethod === 'COD'
  ) {
    console.log('✅ TEST 9 PASSED: Order placed with correct totals, address snapshot, and payment method.\n');
  } else {
    console.error('❌ TEST 9 FAILED:', orderRes.body);
    process.exit(1);
  }

  // ── TEST 10: Cart cleared after order ──────────────────────────────────────
  const cartAfterOrder = await request('/api/cart', 'GET', null, auth);
  const itemsAfterOrder = cartAfterOrder.body.data?.cart?.items?.length || 0;
  console.log('[TEST 10] Cart items after order:', itemsAfterOrder);
  if (itemsAfterOrder === 0) {
    console.log('✅ TEST 10 PASSED: Cart cleared after order placed.\n');
  } else {
    console.error('❌ TEST 10 FAILED'); process.exit(1);
  }

  // ── TEST 11: Order history ────────────────────────────────────────────────────
  const historyRes = await request('/api/checkout/orders', 'GET', null, auth);
  console.log('[TEST 11] Order History Status:', historyRes.status);
  console.log('[TEST 11] Orders Count:', historyRes.body.data?.orders?.length);
  if (historyRes.status === 200 && historyRes.body.data?.orders?.length >= 1) {
    console.log('✅ TEST 11 PASSED: Order history retrieved.\n');
  } else {
    console.error('❌ TEST 11 FAILED'); process.exit(1);
  }

  // ── TEST 12: Delete address ───────────────────────────────────────────────────
  const delRes = await request(`/api/addresses/${addr2._id}`, 'DELETE', null, auth);
  console.log('[TEST 12] Delete Address Status:', delRes.status);
  if (delRes.status === 200) {
    console.log('✅ TEST 12 PASSED: Address deleted successfully.\n');
  } else {
    console.error('❌ TEST 12 FAILED'); process.exit(1);
  }

  console.log('🎉 ALL 12 MODULE 13 ADDRESS + CHECKOUT TESTS PASSED 100%!');
  process.exit(0);
};

run().catch((err) => {
  console.error('FATAL TEST ERROR:', err.message);
  process.exit(1);
});
