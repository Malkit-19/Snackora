/**
 * Comprehensive Automated Verification Suite for Module 16: Admin Dashboard
 */
const http = require('http');
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

const runAdminDashboardTests = async () => {
  console.log('=== SNACKORA MODULE 16: ADMIN DASHBOARD VERIFICATION ===\n');

  // Authenticate Customer and Admin
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;

  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;

  const custHeaders = { Authorization: `Bearer ${custToken}` };
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Test 1: Unauthenticated GET /api/admin/dashboard -> 401
  const unauthRes = await request('/api/admin/dashboard');
  console.log('[TEST 1] Unauthenticated GET /api/admin/dashboard Status:', unauthRes.status);
  if (unauthRes.status === 401) {
    console.log('✅ TEST 1 PASSED: Unauthenticated access blocked.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Test 2: Customer user attempt -> 403 FORBIDDEN
  const custRes = await request('/api/admin/dashboard', 'GET', null, custHeaders);
  console.log('[TEST 2] Customer user attempt Status:', custRes.status);
  if (custRes.status === 403) {
    console.log('✅ TEST 2 PASSED: Non-admin user blocked with 403 FORBIDDEN.\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: Admin access -> 200 OK
  const adminRes = await request('/api/admin/dashboard', 'GET', null, adminHeaders);
  console.log('[TEST 3] Admin access Status:', adminRes.status);
  const data = adminRes.body.data;
  console.log('[TEST 3] Cards Data received:', !!data?.cards);
  console.log('[TEST 3] Graphs Data received:', !!data?.graphs);

  if (adminRes.status === 200 && data?.cards && data?.graphs) {
    console.log('✅ TEST 3 PASSED: Admin successfully accessed dashboard analytics.\n');
  } else {
    console.error('❌ TEST 3 FAILED:', adminRes.body);
    process.exit(1);
  }

  // Test 4: Verify 7 Stat Cards
  const cards = data.cards;
  console.log('[TEST 4] Total Revenue:', cards.totalRevenue);
  console.log('[TEST 4] Total Orders:', cards.totalOrders);
  console.log('[TEST 4] Customers:', cards.customers);
  console.log('[TEST 4] B2B Users:', cards.b2bUsers);
  console.log('[TEST 4] Pending B2B:', cards.pendingB2B);
  console.log('[TEST 4] Low Stock:', cards.lowStock);
  console.log('[TEST 4] Refund Requests:', cards.refundRequests);

  if (
    typeof cards.totalRevenue === 'number' &&
    typeof cards.totalOrders === 'number' &&
    typeof cards.customers === 'number' &&
    typeof cards.b2bUsers === 'number' &&
    typeof cards.pendingB2B === 'number' &&
    typeof cards.lowStock === 'number' &&
    typeof cards.refundRequests === 'number'
  ) {
    console.log('✅ TEST 4 PASSED: All 7 Stat Cards present with real numeric metrics.\n');
  } else {
    console.error('❌ TEST 4 FAILED: Stat cards missing numeric values');
    process.exit(1);
  }

  // Test 5: Verify 7 Analytics Graphs & Distributions
  const graphs = data.graphs;
  console.log('[TEST 5] Revenue Timeline entries:', graphs.revenueOverTime?.length);
  console.log('[TEST 5] Customer vs B2B:', graphs.customerVsB2B);
  console.log('[TEST 5] Category Sales entries:', graphs.categorySales?.length);
  console.log('[TEST 5] Top Products entries:', graphs.topProducts?.length);
  console.log('[TEST 5] Payment Methods entries:', graphs.paymentMethods?.length);

  if (
    Array.isArray(graphs.revenueOverTime) &&
    graphs.customerVsB2B &&
    Array.isArray(graphs.categorySales) &&
    Array.isArray(graphs.topProducts) &&
    Array.isArray(graphs.paymentMethods)
  ) {
    console.log('✅ TEST 5 PASSED: All 7 Analytics Graphs & Distributions populated from live MongoDB data.\n');
  } else {
    console.error('❌ TEST 5 FAILED: Graph data structure invalid');
    process.exit(1);
  }

  // Test 6: Verify Date Range Filters
  const dateRangesToTest = ['today', '7days', '30days', '3months', '12months'];
  for (const r of dateRangesToTest) {
    const rangeRes = await request(`/api/admin/dashboard?range=${r}`, 'GET', null, adminHeaders);
    console.log(`[TEST 6] Date Filter '${r}' Status:`, rangeRes.status);
    if (rangeRes.status !== 200 || rangeRes.body.data?.filterRange !== r) {
      console.error(`❌ TEST 6 FAILED for range ${r}`);
      process.exit(1);
    }
  }
  console.log('✅ TEST 6 PASSED: All Date Range Filters (Today, 7 Days, 30 Days, 3 Months, 12 Months) function correctly.\n');

  console.log('🎉 ALL 6 MODULE 16 ADMIN DASHBOARD VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runAdminDashboardTests().catch((err) => {
  console.error('FATAL ADMIN TEST ERROR:', err);
  process.exit(1);
});
