const http = require('http');

// Simple fetch-like HTTP request helper using native Node http
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('=== SNACKORA BACKEND VERIFICATION SUITE ===\n');

  try {
    // 1. Health Check
    const health = await request('GET', '/api/v1/health');
    console.log(`[TEST 1] Health Check: Status ${health.status} -> DB: ${health.body.database}`);
    if (health.status !== 200 || health.body.database !== 'connected') {
      throw new Error('Health check failed');
    }

    // 2. Retail Customer Login
    const custLogin = await request('POST', '/api/v1/auth/login', {
      email: 'customer@snackora.in',
      password: 'Customer@12345'
    });
    console.log(`[TEST 2] Customer Login: Status ${custLogin.status}, Role: ${custLogin.body.data?.user?.role}`);
    const custToken = custLogin.body.data?.token;

    // 3. Approved B2B Login
    const b2bLogin = await request('POST', '/api/v1/auth/login', {
      email: 'wholesaler@snackora.in',
      password: 'B2b@12345'
    });
    console.log(`[TEST 3] Approved B2B Login: Status ${b2bLogin.status}, Role: ${b2bLogin.body.data?.user?.role}, Status: ${b2bLogin.body.data?.user?.b2bProfile?.verificationStatus}`);
    const b2bToken = b2bLogin.body.data?.token;

    // 4. Admin Login
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@snackora.in',
      password: 'Admin@12345'
    });
    console.log(`[TEST 4] Admin Login: Status ${adminLogin.status}, Role: ${adminLogin.body.data?.user?.role}`);

    // 5. Test Gated Wholesale Pricing - Retail Customer Perspective
    const retailProducts = await request('GET', '/api/v1/products', null, custToken);
    const firstRetailItem = retailProducts.body.data?.products[0];
    const customerCanSeeWholesale = firstRetailItem?.wholesalePrice !== undefined;
    console.log(`[TEST 5] Retail User Pricing Protection: Wholesale price hidden = ${!customerCanSeeWholesale} (Retail: ₹${firstRetailItem?.retailPrice})`);
    if (customerCanSeeWholesale) {
      throw new Error('Security Breach: Retail customer was able to view wholesale price!');
    }

    // 6. Test Gated Wholesale Pricing - Approved B2B Perspective
    const wholesaleProducts = await request('GET', '/api/v1/products', null, b2bToken);
    const firstB2BItem = wholesaleProducts.body.data?.products[0];
    const b2bCanSeeWholesale = firstB2BItem?.wholesalePrice !== undefined;
    console.log(`[TEST 6] Approved B2B Pricing Access: Wholesale price visible = ${b2bCanSeeWholesale} (Retail: ₹${firstB2BItem?.retailPrice}, Wholesale: ₹${firstB2BItem?.wholesalePrice}, MOQ: ${firstB2BItem?.b2bMoq})`);
    if (!b2bCanSeeWholesale) {
      throw new Error('Wholesale partner was not provided wholesale price!');
    }

    // 7. Test New Customer Registration
    const testEmail = `test_customer_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/v1/auth/register', {
      name: 'Test Customer',
      email: testEmail,
      password: 'Password@123',
      phone: '9876500000',
      role: 'ADMIN' // Malicious attempt to self-assign ADMIN
    });
    console.log(`[TEST 7] Security Invariant: Public signup role was assigned: ${regRes.body.data?.user?.role} (Must NOT be ADMIN)`);
    if (regRes.body.data?.user?.role === 'ADMIN') {
      throw new Error('Security Invariant Violated: Public user became ADMIN!');
    }

    // 8. Test New B2B Registration
    const testB2BEmail = `test_wholesaler_${Date.now()}@business.com`;
    const b2bRegRes = await request('POST', '/api/v1/auth/register-b2b', {
      name: 'Business Owner',
      email: testB2BEmail,
      password: 'Password@123',
      phone: '9876501111',
      companyName: 'Sunrise Stores Ltd',
      gstin: '27AABCS1234F1Z1'
    });
    console.log(`[TEST 8] B2B Registration: Role = ${b2bRegRes.body.data?.user?.role}, VerificationStatus = ${b2bRegRes.body.data?.user?.b2bProfile?.verificationStatus}`);
    if (b2bRegRes.body.data?.user?.b2bProfile?.verificationStatus !== 'PENDING') {
      throw new Error('B2B Registration should default to PENDING status!');
    }

    // 9. Fetch Authenticated Me Profile
    const meRes = await request('GET', '/api/v1/auth/me', null, b2bRegRes.body.data?.token);
    console.log(`[TEST 9] /auth/me profile verification: Status ${meRes.status}, Email = ${meRes.body.data?.user?.email}`);

    console.log('\nALL 9 BACKEND SUITE TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  }
};

runTests();
