/**
 * Comprehensive Automated Verification Suite for Module 10: Authentication Backend
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../src/models/User');

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

const runModule10Tests = async () => {
  console.log('=== SNACKORA MODULE 10: AUTHENTICATION BACKEND VERIFICATION ===\n');
  const timestamp = Date.now();

  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora';
  await mongoose.connect(mongoURI);

  // Test 1: POST /api/auth/register (Customer)
  const custEmail = `m10_cust_${timestamp}@snackora.test`;
  const regRes = await request('/api/auth/register', 'POST', {
    name: 'Customer Test',
    email: custEmail,
    password: 'Password@123',
    phone: '+91 9999900001'
  });
  console.log('[TEST 1] POST /api/auth/register Status:', regRes.status);
  console.log('[TEST 1] Role Assigned:', regRes.body.data?.user?.role);
  if (regRes.status === 201 && regRes.body.data?.user?.role === 'CUSTOMER') {
    console.log('✅ TEST 1 PASSED: Customer registered at /api/auth/register.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Test 2: Invariant Check: Never allow ADMIN through public signup
  const adminHackEmail = `m10_adminhack_${timestamp}@snackora.test`;
  const hackRes = await request('/api/auth/register', 'POST', {
    name: 'Fake Admin Attacker',
    email: adminHackEmail,
    password: 'HackerPassword@123',
    role: 'ADMIN' // Malicious role escalation attempt
  });
  console.log('[TEST 2] Admin Escalation Attempt -> Role Assigned:', hackRes.body.data?.user?.role);
  if (hackRes.body.data?.user?.role !== 'ADMIN') {
    console.log('✅ TEST 2 PASSED: Admin creation via public signup strictly blocked.\n');
  } else {
    console.error('❌ TEST 2 FAILED: Security breach! Admin was created via public signup!');
    process.exit(1);
  }

  // Test 3: B2B Wholesaler Registration: b2bStatus must be PENDING
  const b2bEmail = `m10_b2b_${timestamp}@snackora.test`;
  const b2bRes = await request('/api/auth/register-b2b', 'POST', {
    name: 'Ramesh Grocers',
    email: b2bEmail,
    password: 'B2BPassword@123',
    companyName: 'Ramesh Wholesale Ltd',
    gstin: '27AAACR1234B1Z9',
    phone: '+91 9888800002',
    businessType: 'Kirana / Grocery Store'
  });
  console.log('[TEST 3] B2B Registration Status:', b2bRes.status);
  console.log('[TEST 3] B2B Status:', b2bRes.body.data?.user?.b2bStatus);
  console.log('[TEST 3] B2B Role:', b2bRes.body.data?.user?.role);
  if (
    b2bRes.status === 201 &&
    b2bRes.body.data?.user?.role === 'B2B_WHOLESALER' &&
    b2bRes.body.data?.user?.b2bStatus === 'PENDING'
  ) {
    console.log('✅ TEST 3 PASSED: B2B user registered with role B2B_WHOLESALER and b2bStatus PENDING.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Customer Login with Server-side Bcrypt Comparison
  const loginRes = await request('/api/auth/login', 'POST', {
    email: custEmail,
    password: 'Password@123'
  });
  console.log('[TEST 4] Valid Login Status:', loginRes.status);
  const custToken = loginRes.body.data?.token;
  if (loginRes.status === 200 && custToken) {
    console.log('✅ TEST 4 PASSED: Customer authenticated with token.\n');
  } else {
    console.error('❌ TEST 4 FAILED');
    process.exit(1);
  }

  // Test 5: Invalid Password
  const badPwRes = await request('/api/auth/login', 'POST', {
    email: custEmail,
    password: 'WrongPassword@999'
  });
  console.log('[TEST 5] Invalid Password Status:', badPwRes.status);
  if (badPwRes.status === 401 && badPwRes.body.code === 'UNAUTHENTICATED') {
    console.log('✅ TEST 5 PASSED: Invalid password rejected with 401 UNAUTHENTICATED.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: Suspended User Login Blocked (403)
  const suspendedEmail = `m10_suspended_${timestamp}@snackora.test`;
  const suspendedUser = await User.create({
    name: 'Suspended User',
    email: suspendedEmail,
    password: 'Password@123',
    role: 'CUSTOMER',
    status: 'SUSPENDED'
  });

  const suspLoginRes = await request('/api/auth/login', 'POST', {
    email: suspendedEmail,
    password: 'Password@123'
  });
  console.log('[TEST 6] Suspended User Login Status:', suspLoginRes.status);
  console.log('[TEST 6] Code:', suspLoginRes.body.code);
  if (suspLoginRes.status === 403 && suspLoginRes.body.code === 'ACCOUNT_SUSPENDED') {
    console.log('✅ TEST 6 PASSED: Suspended user denied login with 403 ACCOUNT_SUSPENDED.\n');
  } else {
    console.error('❌ TEST 6 FAILED');
    process.exit(1);
  }

  // Test 7: Admin Provisioning & Authentication
  const adminLoginRes = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  console.log('[TEST 7] Admin Login Status:', adminLoginRes.status);
  console.log('[TEST 7] Admin Role:', adminLoginRes.body.data?.user?.role);
  if (adminLoginRes.status === 200 && adminLoginRes.body.data?.user?.role === 'ADMIN') {
    console.log('✅ TEST 7 PASSED: Bootstrap Admin user authenticated successfully.\n');
  } else {
    console.error('❌ TEST 7 FAILED');
    process.exit(1);
  }

  // Test 8: Unauthorized Access without Token
  const noTokenRes = await request('/api/v1/auth/me', 'GET');
  console.log('[TEST 8] Protected Route without Token Status:', noTokenRes.status);
  if (noTokenRes.status === 401 && noTokenRes.body.code === 'UNAUTHENTICATED') {
    console.log('✅ TEST 8 PASSED: Protected route blocks unauthenticated access.\n');
  } else {
    console.error('❌ TEST 8 FAILED');
    process.exit(1);
  }

  // Test 9: Pending B2B Wholesale Price Restriction
  const b2bLoginRes = await request('/api/auth/login', 'POST', {
    email: b2bEmail,
    password: 'B2BPassword@123'
  });
  const b2bToken = b2bLoginRes.body.data?.token;

  // Request product catalog with pending B2B token
  const catalogRes = await request('/api/v1/products?limit=1', 'GET', null, {
    Authorization: `Bearer ${b2bToken}`
  });
  const productItem = catalogRes.body.data?.products?.[0];
  console.log('[TEST 9] Pending B2B wholesale view:', catalogRes.body.data?.isWholesaleView);
  console.log('[TEST 9] Wholesale price stripped:', productItem?.wholesalePrice === undefined);
  if (
    catalogRes.body.data?.isWholesaleView === false &&
    productItem?.wholesalePrice === undefined
  ) {
    console.log('✅ TEST 9 PASSED: Pending B2B user cannot see wholesale prices.\n');
  } else {
    console.error('❌ TEST 9 FAILED: Pending B2B was able to see wholesale prices!');
    process.exit(1);
  }

  // Test 10: Logout Endpoint
  const logoutRes = await request('/api/auth/logout', 'POST');
  console.log('[TEST 10] Logout Endpoint Status:', logoutRes.status);
  if (logoutRes.status === 200 && logoutRes.body.success === true) {
    console.log('✅ TEST 10 PASSED: Logout endpoint responded successfully.\n');
  } else {
    console.error('❌ TEST 10 FAILED');
    process.exit(1);
  }

  // Cleanup
  await User.deleteMany({
    email: { $in: [custEmail, adminHackEmail, b2bEmail, suspendedEmail] }
  });
  await mongoose.disconnect();

  console.log('🎉 ALL 10 AUTHENTICATION BACKEND VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runModule10Tests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
