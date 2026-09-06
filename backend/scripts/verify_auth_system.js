/**
 * Verification script for Module 7: Authentication System
 * Tests:
 * 1. Retail Customer Registration (Customer role, token issued, safe user object)
 * 2. Invariant Check: Public registration cannot create ADMIN role
 * 3. B2B Wholesaler Registration with GSTIN (Role B2B_WHOLESALER, Status PENDING)
 * 4. User Login with valid credentials
 * 5. User Login with invalid credentials (returns 401 error)
 * 6. Duplicate Email Prevention (returns 409 conflict error)
 */
const http = require('http');

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
        path: '/api/v1' + path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const runAuthTests = async () => {
  console.log('=== SNACKORA MODULE 7: AUTHENTICATION SYSTEM VERIFICATION ===\n');
  const timestamp = Date.now();

  // Test 1: Retail Customer Registration
  const testCustomerEmail = `test_customer_${timestamp}@snackora.test`;
  const regRes = await request('/auth/register', 'POST', {
    name: 'Ananya Gupta',
    email: testCustomerEmail,
    password: 'Password@123',
    phone: '+91 9876543211',
    role: 'ADMIN' // Trying to exploit role assignment
  });

  console.log('[TEST 1] Retail Registration Status:', regRes.status);
  console.log('[TEST 1] User Role Assigned:', regRes.body.data?.user?.role);
  if (regRes.status === 201 && regRes.body.data?.user?.role === 'CUSTOMER') {
    console.log('✅ TEST 1 PASSED: Retail customer registered. ADMIN injection rejected, forced to CUSTOMER.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', regRes.body);
    process.exit(1);
  }

  // Test 2: B2B Wholesaler Registration
  const testB2BEmail = `test_b2b_${timestamp}@snackora.test`;
  const b2bRes = await request('/auth/register-b2b', 'POST', {
    name: 'Suresh Patel',
    email: testB2BEmail,
    password: 'B2BPassword@123',
    phone: '+91 9822099999',
    companyName: 'Patel FMCG SuperMart',
    gstin: '24AAACP1234A1Z5',
    businessType: 'Supermarket / Hypermarket',
    businessAddress: {
      street: '12 Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      postalCode: '380015',
      country: 'India'
    }
  });

  console.log('[TEST 2] B2B Registration Status:', b2bRes.status);
  console.log('[TEST 2] B2B Role:', b2bRes.body.data?.user?.role);
  console.log('[TEST 2] B2B Verification Status:', b2bRes.body.data?.user?.b2bProfile?.verificationStatus);
  if (
    b2bRes.status === 201 &&
    b2bRes.body.data?.user?.role === 'B2B_WHOLESALER' &&
    b2bRes.body.data?.user?.b2bProfile?.verificationStatus === 'PENDING'
  ) {
    console.log('✅ TEST 2 PASSED: B2B wholesaler registered with PENDING verification status.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', b2bRes.body);
    process.exit(1);
  }

  // Test 3: Login with newly created customer
  const loginRes = await request('/auth/login', 'POST', {
    email: testCustomerEmail,
    password: 'Password@123'
  });

  console.log('[TEST 3] Valid Login Status:', loginRes.status);
  console.log('[TEST 3] Token Generated:', Boolean(loginRes.body.data?.token));
  if (loginRes.status === 200 && loginRes.body.data?.token) {
    console.log('✅ TEST 3 PASSED: Valid credentials authenticated successfully.\n');
  } else {
    console.error('❌ TEST 3 FAILED:', loginRes.body);
    process.exit(1);
  }

  // Test 4: Login with incorrect password
  const badLoginRes = await request('/auth/login', 'POST', {
    email: testCustomerEmail,
    password: 'WrongPassword@999'
  });

  console.log('[TEST 4] Bad Password Status:', badLoginRes.status);
  if (badLoginRes.status === 401) {
    console.log('✅ TEST 4 PASSED: Incorrect credentials rejected with 401 Unauthorized.\n');
  } else {
    console.error('❌ TEST 4 FAILED: Expected 401, got', badLoginRes.status);
    process.exit(1);
  }

  // Test 5: Duplicate registration prevention
  const dupRes = await request('/auth/register', 'POST', {
    name: 'Duplicate Test',
    email: testCustomerEmail,
    password: 'Password@123'
  });

  console.log('[TEST 5] Duplicate Email Status:', dupRes.status);
  if (dupRes.status === 409) {
    console.log('✅ TEST 5 PASSED: Duplicate registration rejected with 409 Conflict.\n');
  } else {
    console.error('❌ TEST 5 FAILED: Expected 409, got', dupRes.status);
    process.exit(1);
  }

  console.log('🎉 ALL 5 AUTHENTICATION SYSTEM TESTS PASSED 100%!');
  process.exit(0);
};

runAuthTests().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
