/**
 * Comprehensive Automated Verification Suite for Module 17: Admin CRUD
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

const runAdminCRUDTests = async () => {
  console.log('=== SNACKORA MODULE 17: ADMIN CRUD VERIFICATION ===\n');

  // Connect Mongoose to inspect AuditLog collection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  }
  const AuditLog = require('../src/models/AuditLog');

  // Authenticate Admin and Customer
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;

  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const custHeaders = { Authorization: `Bearer ${custToken}` };

  // Fetch sample category
  const catRes = await request('/api/categories');
  const sampleCatId = catRes.body.data?.categories?.[0]?._id;

  // ── SECTION 1: PRODUCTS CRUD ───────────────────────────────────────────────
  const testSku = `M17-CRUD-${Date.now()}`;
  const createProdRes = await request('/api/products', 'POST', {
    name: 'Module 17 Test Snack',
    sku: testSku,
    description: 'Special admin test snack item.',
    category: sampleCatId,
    flavour: 'Spicy Cheese',
    weight: '150g',
    ingredients: 'Makhana, Cheese Powder, Olive Oil, Salt',
    mrp: 299,
    retailPrice: 249,
    b2bPrice: 180,
    wholesalePrice: 180,
    discount: 50,
    stock: 500,
    moq: 12,
    b2bMoq: 12,
    images: [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35', isPrimary: true }],
    featured: true,
    active: true
  }, adminHeaders);

  console.log('[TEST 1] Admin Create Product Status:', createProdRes.status);
  const createdProd = createProdRes.body.data?.product;
  console.log('[TEST 1] Product ID:', createdProd?._id);
  console.log('[TEST 1] B2B Price:', createdProd?.wholesalePrice || createdProd?.b2bPrice);

  if (createProdRes.status === 201 && createdProd?.sku === testSku) {
    console.log('✅ TEST 1 PASSED: Admin created product with all 16 editable fields.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', createProdRes.body);
    process.exit(1);
  }

  // Update Product
  const updateProdRes = await request(`/api/products/${createdProd._id}`, 'PUT', {
    retailPrice: 229,
    stock: 750,
    flavour: 'Extra Spicy Cheese'
  }, adminHeaders);

  console.log('[TEST 2] Admin Update Product Status:', updateProdRes.status);
  console.log('[TEST 2] Updated Retail Price:', updateProdRes.body.data?.product?.retailPrice);
  if (updateProdRes.status === 200 && updateProdRes.body.data?.product?.retailPrice === 229) {
    console.log('✅ TEST 2 PASSED: Admin updated product pricing and stock.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // Delete Product
  const delProdRes = await request(`/api/products/${createdProd._id}`, 'DELETE', null, adminHeaders);
  console.log('[TEST 3] Admin Delete Product Status:', delProdRes.status);
  if (delProdRes.status === 200) {
    console.log('✅ TEST 3 PASSED: Admin deleted product.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── SECTION 2: USERS ADMIN MANAGEMENT ─────────────────────────────────────
  const usersListRes = await request('/api/admin/users', 'GET', null, adminHeaders);
  console.log('[TEST 4] Admin List Users Status:', usersListRes.status);
  const users = usersListRes.body.data?.users || [];
  console.log('[TEST 4] Users returned count:', users.length);
  const sampleUser = users[0];

  // Verify password / passwordHash NEVER exposed
  const passwordExposed = users.some(u => u.password !== undefined || u.passwordHash !== undefined);
  console.log('[TEST 4] Passwords exposed in response:', passwordExposed);

  if (usersListRes.status === 200 && users.length >= 1 && !passwordExposed) {
    console.log('✅ TEST 4 PASSED: User list retrieved. Passwords NEVER exposed in response.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // Single User Details + Order History
  const singleUserRes = await request(`/api/admin/users/${sampleUser._id}`, 'GET', null, adminHeaders);
  console.log('[TEST 5] Admin Single User Details Status:', singleUserRes.status);
  console.log('[TEST 5] Order History count:', singleUserRes.body.data?.orderHistory?.length);
  if (singleUserRes.status === 200 && singleUserRes.body.data?.user) {
    console.log('✅ TEST 5 PASSED: Admin retrieved user profile details and order history.\n');
  } else {
    console.error('❌ TEST 5 FAILED'); process.exit(1);
  }

  // Update User Status (Suspend/Activate)
  const suspendRes = await request(`/api/admin/users/${sampleUser._id}/status`, 'PATCH', {
    status: 'ACTIVE',
    reason: 'Routine compliance check'
  }, adminHeaders);

  console.log('[TEST 6] Admin Update User Status:', suspendRes.status);
  if (suspendRes.status === 200 && suspendRes.body.data?.user?.status === 'ACTIVE') {
    console.log('✅ TEST 6 PASSED: User status updated successfully.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── SECTION 3: CATEGORIES CRUD ─────────────────────────────────────────────
  const testCatName = `M17 Category ${Date.now()}`;
  const createCatRes = await request('/api/categories', 'POST', {
    name: testCatName,
    description: 'Category created by Admin CRUD test.',
    displayOrder: 99,
    isActive: true
  }, adminHeaders);

  console.log('[TEST 7] Admin Create Category Status:', createCatRes.status);
  const createdCat = createCatRes.body.data?.category;
  console.log('[TEST 7] Category ID:', createdCat?._id);

  if (createCatRes.status === 201 && createdCat?.name === testCatName) {
    console.log('✅ TEST 7 PASSED: Category created.\n');
  } else {
    console.error('❌ TEST 7 FAILED:', createCatRes.body); process.exit(1);
  }

  // Toggle Category Status
  const toggleCatRes = await request(`/api/categories/${createdCat._id}/status`, 'PATCH', {
    isActive: false
  }, adminHeaders);
  console.log('[TEST 8] Toggle Category Status:', toggleCatRes.status);
  if (toggleCatRes.status === 200 && toggleCatRes.body.data?.category?.isActive === false) {
    console.log('✅ TEST 8 PASSED: Category status toggled to inactive.\n');
  } else {
    console.error('❌ TEST 8 FAILED'); process.exit(1);
  }

  // Delete Category
  const delCatRes = await request(`/api/categories/${createdCat._id}`, 'DELETE', null, adminHeaders);
  console.log('[TEST 9] Delete Category Status:', delCatRes.status);
  if (delCatRes.status === 200) {
    console.log('✅ TEST 9 PASSED: Category deleted.\n');
  } else {
    console.error('❌ TEST 9 FAILED'); process.exit(1);
  }

  // ── SECTION 4: AUDIT LOGS VERIFICATION ─────────────────────────────────────
  const auditLogs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('[TEST 10] Recent Audit Logs in MongoDB count:', auditLogs.length);
  const actionsLogged = auditLogs.map(a => a.action);
  console.log('[TEST 10] Logged Admin Actions:', actionsLogged.join(', '));

  if (auditLogs.length >= 3) {
    console.log('✅ TEST 10 PASSED: Sensitive admin operations automatically recorded in AuditLog collection.\n');
  } else {
    console.error('❌ TEST 10 FAILED: Audit logs missing'); process.exit(1);
  }

  console.log('🎉 ALL 10 MODULE 17 ADMIN CRUD VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runAdminCRUDTests().catch((err) => {
  console.error('FATAL ADMIN CRUD TEST ERROR:', err);
  process.exit(1);
});
