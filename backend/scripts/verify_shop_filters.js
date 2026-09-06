const http = require('http');

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runTests = async () => {
  console.log('=== VERIFYING SHOP & FILTER ENGINE ===\n');

  try {
    // 1. Test Category Filter
    const catRes = await request('GET', '/api/v1/products?category=makhana');
    const prods = catRes.body.data?.products || [];
    console.log(`[TEST 1] Category=makhana returned ${prods.length} items`);
    if (prods.length === 0 || !prods.every(p => p.category.slug === 'makhana')) {
      throw new Error('Category filter failed: unexpected products returned');
    }

    // 2. Test Flavour Filter
    const flavRes = await request('GET', '/api/v1/products?flavour=peri-peri');
    const periProds = flavRes.body.data?.products || [];
    console.log(`[TEST 2] Flavour=peri-peri returned ${periProds.length} item(s): "${periProds[0]?.name}"`);
    if (periProds.length === 0 || !periProds[0].name.toLowerCase().includes('peri peri')) {
      throw new Error('Flavour filter failed to match Peri Peri');
    }

    // 3. Test Price Range Filter
    const priceRes = await request('GET', '/api/v1/products?minPrice=150&maxPrice=180');
    const priceProds = priceRes.body.data?.products || [];
    console.log(`[TEST 3] Price range 150-180 returned ${priceProds.length} items`);
    if (priceProds.some(p => p.retailPrice < 150 || p.retailPrice > 180)) {
      throw new Error('Price range filter failed');
    }

    // 4. Test Sorting: Price Ascending
    const sortRes = await request('GET', '/api/v1/products?sort=price_asc&limit=10');
    const sortedProds = sortRes.body.data?.products || [];
    console.log(`[TEST 4] Sort=price_asc: First price ₹${sortedProds[0]?.retailPrice}, Second price ₹${sortedProds[1]?.retailPrice}`);
    for (let i = 0; i < sortedProds.length - 1; i++) {
      if (sortedProds[i].retailPrice > sortedProds[i + 1].retailPrice) {
        throw new Error('Price ascending sort order violation');
      }
    }

    // 5. Test Server Pagination
    const pageRes = await request('GET', '/api/v1/products?page=1&limit=4');
    const pag = pageRes.body.data?.pagination;
    console.log(`[TEST 5] Pagination limit=4: Returned page ${pag.page} of ${pag.pages}, Total: ${pag.total}, hasNextPage: ${pag.hasNextPage}`);
    if (pag.limit !== 4 || pag.pages < 2 || !pag.hasNextPage) {
      throw new Error('Pagination metadata failed');
    }

    // 6. Test Authoritative B2B Wholesale Pricing Security
    // First, unauthenticated guest
    const guestProds = await request('GET', '/api/v1/products?limit=1');
    const guestItem = guestProds.body.data?.products[0];
    if (guestItem.wholesalePrice !== undefined) {
      throw new Error('SECURITY VIOLATION: Unauthenticated user saw wholesale price!');
    }
    console.log(`[TEST 6A] Retail Security: Wholesale price stripped for guest = true`);

    // Second, logged in Approved B2B Wholesaler
    const b2bLogin = await request('POST', '/api/v1/auth/login', {
      email: 'wholesaler@snackora.in',
      password: 'B2b@12345'
    });
    const b2bToken = b2bLogin.body.data?.token;
    const b2bProds = await request('GET', '/api/v1/products?limit=1', null, b2bToken);
    const b2bItem = b2bProds.body.data?.products[0];
    if (b2bItem.wholesalePrice === undefined || b2bItem.b2bMoq === undefined) {
      throw new Error('B2B partner could not see wholesale pricing!');
    }
    console.log(`[TEST 6B] B2B Privilege: Approved partner saw wholesale price ₹${b2bItem.wholesalePrice} & MOQ ${b2bItem.b2bMoq}`);

    console.log('\nALL 6 SHOP FILTER & PAGINATION BACKEND TESTS PASSED 100%!');
    process.exit(0);
  } catch (err) {
    console.error('Filter test failed:', err.message);
    process.exit(1);
  }
};

runTests();
