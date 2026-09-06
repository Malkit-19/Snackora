/**
 * Comprehensive Automated Verification Suite for Module 11: Product API
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

const runModule11Tests = async () => {
  console.log('=== SNACKORA MODULE 11: PRODUCT API VERIFICATION ===\n');

  // Authenticate Admin & Customer
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;

  const customerLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const customerToken = customerLogin.body.data?.token;

  const b2bLogin = await request('/api/auth/login', 'POST', {
    email: 'wholesaler@snackora.in',
    password: 'B2b@12345'
  });
  const b2bToken = b2bLogin.body.data?.token;

  const pendingB2bLogin = await request('/api/auth/login', 'POST', {
    email: 'pendingb2b@snackora.in',
    password: 'Pending@12345'
  });
  const pendingB2bToken = pendingB2bLogin.body.data?.token;

  // Test 1: GET /api/categories
  const catRes = await request('/api/categories');
  console.log('[TEST 1] GET /api/categories Status:', catRes.status);
  console.log('[TEST 1] Categories Count:', catRes.body.data?.categories?.length);
  if (catRes.status === 200 && catRes.body.data?.categories?.length >= 4) {
    console.log('✅ TEST 1 PASSED: Categories API functioning.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Test 2: GET /api/products
  const prodRes = await request('/api/products?limit=4');
  console.log('[TEST 2] GET /api/products Status:', prodRes.status);
  console.log('[TEST 2] Products returned:', prodRes.body.data?.products?.length);
  if (prodRes.status === 200 && prodRes.body.data?.products?.length > 0) {
    console.log('✅ TEST 2 PASSED: Public products endpoint returned items.\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: GET /api/products/:id (by slug and by ObjectId)
  const sampleProduct = prodRes.body.data?.products[0];
  const bySlugRes = await request(`/api/products/${sampleProduct.slug}`);
  const byIdRes = await request(`/api/products/${sampleProduct._id}`);
  console.log('[TEST 3] Lookup by slug Status:', bySlugRes.status);
  console.log('[TEST 3] Lookup by ObjectId Status:', byIdRes.status);
  if (bySlugRes.status === 200 && byIdRes.status === 200 && bySlugRes.body.data?.product?.name === sampleProduct.name) {
    console.log('✅ TEST 3 PASSED: Products lookup works by both slug and MongoDB ID.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Pricing Rules (Customer vs Approved B2B vs Pending B2B)
  const guestProd = (await request(`/api/products/${sampleProduct.slug}`)).body.data;
  const custProd = (await request(`/api/products/${sampleProduct.slug}`, 'GET', null, { Authorization: `Bearer ${customerToken}` })).body.data;
  const pendingB2bProd = (await request(`/api/products/${sampleProduct.slug}`, 'GET', null, { Authorization: `Bearer ${pendingB2bToken}` })).body.data;
  const approvedB2bProd = (await request(`/api/products/${sampleProduct.slug}`, 'GET', null, { Authorization: `Bearer ${b2bToken}` })).body.data;

  console.log('[TEST 4] Guest wholesalePrice stripped:', guestProd.product?.wholesalePrice === undefined);
  console.log('[TEST 4] Customer wholesalePrice stripped:', custProd.product?.wholesalePrice === undefined);
  console.log('[TEST 4] Pending B2B wholesalePrice stripped:', pendingB2bProd.product?.wholesalePrice === undefined);
  console.log('[TEST 4] Approved B2B sees wholesalePrice:', approvedB2bProd.product?.wholesalePrice !== undefined);

  if (
    guestProd.product?.wholesalePrice === undefined &&
    custProd.product?.wholesalePrice === undefined &&
    pendingB2bProd.product?.wholesalePrice === undefined &&
    approvedB2bProd.product?.wholesalePrice !== undefined
  ) {
    console.log('✅ TEST 4 PASSED: Authoritative price rules enforced 100% server-side.\n');
  } else {
    console.error('❌ TEST 4 FAILED: Price leakage detected!');
    process.exit(1);
  }

  // Test 5: Admin RBAC Security Enforcement
  // Guest attempt to create product -> 401
  const unauthPost = await request('/api/products', 'POST', { name: 'Hack Product' });
  // Customer attempt to create product -> 403
  const custPost = await request('/api/products', 'POST', { name: 'Customer Product' }, { Authorization: `Bearer ${customerToken}` });

  console.log('[TEST 5] Unauthenticated POST Status:', unauthPost.status);
  console.log('[TEST 5] Customer POST Status:', custPost.status);
  if (unauthPost.status === 401 && custPost.status === 403) {
    console.log('✅ TEST 5 PASSED: Unauthorized product modifications rejected.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: Admin POST /api/products, PUT /api/products/:id, DELETE /api/products/:id
  const timestamp = Date.now();
  const newProductPayload = {
    name: `Admin Test Makhana ${timestamp}`,
    sku: `MK-ADM-${timestamp.toString().slice(-6)}`,
    category: 'makhana',
    flavour: 'Indian Touch',
    weight: '80g',
    retailPrice: 175,
    wholesalePrice: 110,
    stock: 120,
    moq: 15,
    description: 'Fresh admin-created gourmet makhana snack.'
  };

  const createRes = await request('/api/products', 'POST', newProductPayload, { Authorization: `Bearer ${adminToken}` });
  console.log('[TEST 6] Admin Create Product Status:', createRes.status);
  const createdId = createRes.body.data?.product?._id;

  if (createRes.status === 201 && createdId) {
    console.log('  ✓ Product created successfully with ID:', createdId);
  } else {
    console.error('❌ TEST 6 (Create) FAILED:', createRes.body);
    process.exit(1);
  }

  // Admin PUT update
  const updateRes = await request(`/api/products/${createdId}`, 'PUT', { retailPrice: 185, stock: 150 }, { Authorization: `Bearer ${adminToken}` });
  console.log('[TEST 6] Admin Update Product Status:', updateRes.status);
  if (updateRes.status === 200 && updateRes.body.data?.product?.retailPrice === 185) {
    console.log('  ✓ Product price updated to ₹185');
  } else {
    console.error('❌ TEST 6 (Update) FAILED');
    process.exit(1);
  }

  // Admin DELETE
  const deleteRes = await request(`/api/products/${createdId}`, 'DELETE', null, { Authorization: `Bearer ${adminToken}` });
  console.log('[TEST 6] Admin Delete Product Status:', deleteRes.status);
  if (deleteRes.status === 200) {
    console.log('  ✓ Product deleted successfully');
  } else {
    console.error('❌ TEST 6 (Delete) FAILED');
    process.exit(1);
  }
  console.log('✅ TEST 6 PASSED: Admin CRUD pipeline fully operational.\n');

  // Test 7: Validation Failures (Negative Price, Missing Name, Duplicate SKU)
  const negPriceRes = await request('/api/products', 'POST', {
    name: 'Bad Price Product',
    sku: `MK-BAD-${timestamp}`,
    category: 'makhana',
    retailPrice: -50,
    stock: 10
  }, { Authorization: `Bearer ${adminToken}` });

  const dupSkuRes = await request('/api/products', 'POST', {
    name: 'Duplicate SKU Product',
    sku: sampleProduct.sku,
    category: 'makhana',
    retailPrice: 100,
    stock: 10
  }, { Authorization: `Bearer ${adminToken}` });

  console.log('[TEST 7] Negative price validation Status:', negPriceRes.status);
  console.log('[TEST 7] Duplicate SKU validation Status:', dupSkuRes.status);

  if (negPriceRes.status === 400 && dupSkuRes.status === 409) {
    console.log('✅ TEST 7 PASSED: Price & SKU uniqueness validations functioning properly.\n');
  } else {
    console.error('❌ TEST 7 FAILED');
    process.exit(1);
  }

  console.log('🎉 ALL 7 PRODUCT API VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runModule11Tests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
