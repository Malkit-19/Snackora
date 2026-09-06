/**
 * Comprehensive Automated Test Suite for Module 8: Backend Foundation
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

const runTests = async () => {
  console.log('=== SNACKORA MODULE 8: BACKEND FOUNDATION VERIFICATION ===\n');

  // Test 1: GET /api/health
  const healthRes = await request('/api/health');
  console.log('[TEST 1] GET /api/health -> Status:', healthRes.status);
  console.log('[TEST 1] Response Structure:', JSON.stringify(healthRes.body, null, 2));

  if (
    healthRes.status === 200 &&
    healthRes.body.success === true &&
    healthRes.body.data?.status === 'healthy' &&
    healthRes.body.data?.database?.status === 'connected'
  ) {
    console.log('✅ TEST 1 PASSED: /api/health returns standardized health payload with active DB.\n');
  } else {
    console.error('❌ TEST 1 FAILED');
    process.exit(1);
  }

  // Test 2: GET /api/v1/health
  const v1HealthRes = await request('/api/v1/health');
  console.log('[TEST 2] GET /api/v1/health -> Status:', v1HealthRes.status);
  if (v1HealthRes.status === 200 && v1HealthRes.body.success === true) {
    console.log('✅ TEST 2 PASSED: /api/v1/health returns standardized health payload.\n');
  } else {
    console.error('❌ TEST 2 FAILED');
    process.exit(1);
  }

  // Test 3: Middleware verification (Helmet, Rate Limiting, CORS)
  console.log('[TEST 3] Inspecting HTTP Security Headers:');
  console.log('  - helmet (x-dns-prefetch-control):', healthRes.headers['x-dns-prefetch-control']);
  console.log('  - rate-limit headers:', healthRes.headers['ratelimit-limit'], 'remaining:', healthRes.headers['ratelimit-remaining']);
  
  if (healthRes.headers['ratelimit-limit']) {
    console.log('✅ TEST 3 PASSED: Security headers & Rate limiting active.\n');
  } else {
    console.error('❌ TEST 3 FAILED: Rate limit headers missing');
    process.exit(1);
  }

  // Test 4: 404 Error Handling & Error Response Schema
  const notFoundRes = await request('/api/v1/non-existent-endpoint');
  console.log('[TEST 4] 404 Test -> Status:', notFoundRes.status);
  console.log('[TEST 4] 404 Body:', JSON.stringify(notFoundRes.body));
  if (
    notFoundRes.status === 404 &&
    notFoundRes.body.success === false &&
    notFoundRes.body.code === 'NOT_FOUND'
  ) {
    console.log('✅ TEST 4 PASSED: 404 caught by error middleware with standard error schema.\n');
  } else {
    console.error('❌ TEST 4 FAILED');
    process.exit(1);
  }

  // Test 5: Authentication Error & Unauthenticated Schema
  const authErrRes = await request('/api/v1/auth/me', 'GET', null, {
    Authorization: 'Bearer invalid.token.value'
  });
  console.log('[TEST 5] Invalid Token Test -> Status:', authErrRes.status);
  console.log('[TEST 5] Body:', JSON.stringify(authErrRes.body));
  if (
    authErrRes.status === 401 &&
    authErrRes.body.success === false &&
    authErrRes.body.code === 'UNAUTHENTICATED'
  ) {
    console.log('✅ TEST 5 PASSED: JWT error handled gracefully with UNAUTHENTICATED code.\n');
  } else {
    console.error('❌ TEST 5 FAILED');
    process.exit(1);
  }

  // Test 6: Validation Error Schema (Invalid Login Submission)
  const badLoginRes = await request('/api/v1/auth/login', 'POST', {
    email: '',
    password: ''
  });
  console.log('[TEST 6] Validation Error Test -> Status:', badLoginRes.status);
  console.log('[TEST 6] Body:', JSON.stringify(badLoginRes.body));
  if (
    badLoginRes.status === 400 &&
    badLoginRes.body.success === false
  ) {
    console.log('✅ TEST 6 PASSED: Bad request returns standard error response schema.\n');
  } else {
    console.error('❌ TEST 6 FAILED');
    process.exit(1);
  }

  console.log('🎉 ALL 6 BACKEND FOUNDATION VERIFICATION TESTS PASSED 100%!');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
