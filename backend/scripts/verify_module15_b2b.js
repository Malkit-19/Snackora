/**
 * Comprehensive Automated Verification Suite for Module 15: Complete B2B System
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

const runB2BTests = async () => {
  console.log('=== SNACKORA MODULE 15: COMPLETE B2B SYSTEM VERIFICATION ===\n');

  // Authenticate Customer, Pending B2B user, and Admin
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

  // Test 1: Customer submits B2B Wholesale Application (POST /api/b2b/apply)
  const applyRes = await request('/api/b2b/apply', 'POST', {
    businessName: 'Snackora Retail Mart LLP',
    ownerName: 'Rahul Sharma',
    businessType: 'Supermarket / Hypermarket',
    gstNumber: '27AAAAA0000A1Z5',
    mobile: '9876543210',
    email: 'customer@snackora.in',
    address: 'Plot 45, MIDC Industrial Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    expectedMonthlyOrder: '₹1,00,000 – ₹5,00,000 / month',
    productsInterestedIn: ['Makhana', 'Protein Bars'],
    message: 'We operate 5 retail supermarkets in Mumbai and require bulk wholesale distribution.'
  }, custHeaders);

  console.log('[TEST 1] Submit B2B Application Status:', applyRes.status);
  const application = applyRes.body.data?.application;
  console.log('[TEST 1] Application ID:', application?._id);
  console.log('[TEST 1] Application Status:', application?.status);

  if (applyRes.status === 201 && application?.status === 'PENDING' && application?.gstin === '27AAAAA0000A1Z5') {
    console.log('✅ TEST 1 PASSED: B2B application submitted with PENDING status.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', applyRes.body);
    process.exit(1);
  }

  // Test 2: Check user's B2B application status (GET /api/b2b/status)
  const statusRes = await request('/api/b2b/status', 'GET', null, custHeaders);
  console.log('[TEST 2] Get B2B Status:', statusRes.status);
  console.log('[TEST 2] b2bStatus in profile:', statusRes.body.data?.b2bStatus);
  console.log('[TEST 2] isPending:', statusRes.body.data?.isPending);

  if (statusRes.status === 200 && statusRes.body.data?.b2bStatus === 'PENDING' && statusRes.body.data?.isPending === true) {
    console.log('✅ TEST 2 PASSED: B2B status retrieved accurately.\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: Admin lists B2B applications (GET /api/admin/b2b/applications)
  const adminAppsRes = await request('/api/admin/b2b/applications', 'GET', null, adminHeaders);
  console.log('[TEST 3] Admin Get B2B Applications Status:', adminAppsRes.status);
  const appsList = adminAppsRes.body.data?.applications || [];
  console.log('[TEST 3] Applications Count:', appsList.length);

  if (adminAppsRes.status === 200 && appsList.length >= 1) {
    console.log('✅ TEST 3 PASSED: Admin retrieved B2B applications list.\n');
  } else {
    console.error('❌ TEST 3 FAILED');
    process.exit(1);
  }

  // Test 4: Admin approves B2B application (PATCH /api/admin/b2b/applications/:id/approve)
  const approveRes = await request(`/api/admin/b2b/applications/${application._id}/approve`, 'PATCH', {}, adminHeaders);
  console.log('[TEST 4] Admin Approve Application Status:', approveRes.status);
  console.log('[TEST 4] Approved App Status:', approveRes.body.data?.application?.status);

  if (approveRes.status === 200 && approveRes.body.data?.application?.status === 'APPROVED') {
    console.log('✅ TEST 4 PASSED: Admin approved application and set status to APPROVED.\n');
  } else {
    console.error('❌ TEST 4 FAILED:', approveRes.body);
    process.exit(1);
  }

  // Test 5: Verify wholesale pricing unlocked for newly approved partner
  const wholesaleCheck = await request('/api/b2b/status', 'GET', null, custHeaders);
  const updatedStatus = wholesaleCheck.body.data?.b2bStatus;
  const isApproved = wholesaleCheck.body.data?.isApproved;

  const prodRes = await request('/api/products?limit=1', 'GET', null, custHeaders);
  const sampleProd = prodRes.body.data?.products?.[0];
  console.log('[TEST 5] Customer is now APPROVED B2B:', isApproved);
  console.log('[TEST 5] Sees Wholesale Price:', sampleProd?.wholesalePrice || sampleProd?.b2bPrice);

  if (updatedStatus === 'APPROVED' && isApproved === true && sampleProd?.wholesalePrice !== undefined) {
    console.log('✅ TEST 5 PASSED: Approved B2B user now receives wholesale pricing across catalog.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: Submit custom business request (POST /api/b2b/requests)
  const reqTypesToTest = ['Custom Pricing', 'Large Order', 'Recurring Supply', 'Custom Packaging', 'Product Request'];
  let lastReqId = null;

  for (const rType of reqTypesToTest) {
    const reqRes = await request('/api/b2b/requests', 'POST', {
      requestType: rType,
      companyName: 'Snackora Retail Mart LLP',
      contactPerson: 'Rahul Sharma',
      email: 'customer@snackora.in',
      phone: '9876543210',
      requestedQuantity: 5000,
      requestedPrice: 180,
      message: `Need custom bulk quote for ${rType} requirement.`
    }, custHeaders);

    if (reqRes.status !== 201) {
      console.error(`❌ TEST 6 FAILED at ${rType}:`, reqRes.body);
      process.exit(1);
    }
    lastReqId = reqRes.body.data?.request?._id;
  }
  console.log('✅ TEST 6 PASSED: Custom business requests created for all 5 request types.\n');

  // Test 7: Get user's custom business requests (GET /api/b2b/requests)
  const userReqsRes = await request('/api/b2b/requests', 'GET', null, custHeaders);
  console.log('[TEST 7] User Get B2B Requests Status:', userReqsRes.status);
  console.log('[TEST 7] User Requests Count:', userReqsRes.body.data?.requests?.length);

  if (userReqsRes.status === 200 && userReqsRes.body.data?.requests?.length >= 5) {
    console.log('✅ TEST 7 PASSED: User retrieved submitted business requests.\n');
  } else {
    console.error('❌ TEST 7 FAILED');
    process.exit(1);
  }

  // Test 8: Admin lists custom business requests (GET /api/admin/b2b/requests)
  const adminReqsRes = await request('/api/admin/b2b/requests', 'GET', null, adminHeaders);
  console.log('[TEST 8] Admin Get All B2B Requests Status:', adminReqsRes.status);
  const totalAdminReqs = adminReqsRes.body.data?.requests?.length || 0;
  console.log('[TEST 8] Total Requests in Admin view:', totalAdminReqs);

  if (adminReqsRes.status === 200 && totalAdminReqs >= 5) {
    console.log('✅ TEST 8 PASSED: Admin listed all platform business requests.\n');
  } else {
    console.error('❌ TEST 8 FAILED');
    process.exit(1);
  }

  // Test 9: Admin updates request status & counter offer (PATCH /api/admin/b2b/requests/:id)
  const reqUpdateRes = await request(`/api/admin/b2b/requests/${lastReqId}`, 'PATCH', {
    status: 'COUNTER_OFFER',
    counterOfferPrice: 185,
    adminResponse: 'We can fulfill 5,000 units at ₹185/unit with custom packaging.'
  }, adminHeaders);

  console.log('[TEST 9] Admin Update Request Status:', reqUpdateRes.status);
  const updatedReq = reqUpdateRes.body.data?.request;
  console.log('[TEST 9] New Request Status:', updatedReq?.status);
  console.log('[TEST 9] Counter Offer Price:', updatedReq?.counterOfferPrice);

  if (
    reqUpdateRes.status === 200 &&
    updatedReq?.status === 'COUNTER_OFFER' &&
    updatedReq?.counterOfferPrice === 185
  ) {
    console.log('✅ TEST 9 PASSED: Admin updated B2B request status to COUNTER_OFFER with counter price.\n');
  } else {
    console.error('❌ TEST 9 FAILED:', reqUpdateRes.body);
    process.exit(1);
  }

  console.log('🎉 ALL 9 MODULE 15 COMPLETE B2B SYSTEM VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runB2BTests().catch((err) => {
  console.error('FATAL B2B TEST ERROR:', err);
  process.exit(1);
});
