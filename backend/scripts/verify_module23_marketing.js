/**
 * Comprehensive Automated Verification Suite for Module 23: Marketing System
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const request = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (body) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers: reqHeaders },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch (e) { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

const runMarketingTests = async () => {
  console.log('=== SNACKORA MODULE 23: MARKETING SYSTEM VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const User = require('../src/models/User');
  const Coupon = require('../src/models/Coupon');
  const Banner = require('../src/models/Banner');
  const Ad = require('../src/models/Ad');
  const AuditLog = require('../src/models/AuditLog');

  // Authenticate Admin and Customer
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;
  const adminH = { Authorization: `Bearer ${adminToken}` };

  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custH = { Authorization: `Bearer ${custToken}` };

  // Clear previous test marketing artifacts
  await Coupon.deleteMany({ code: { $in: ['TEST20', 'FLAT100', 'EXPIRED10', 'B2BONLY'] } });
  await Banner.deleteMany({ title: { $regex: /TEST/i } });
  await Ad.deleteMany({ title: { $regex: /TEST/i } });

  // ── TEST 1: Admin Create Percentage & Flat Coupons ────────────────────────
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  // 1a. Percentage Coupon with Cap
  const createPercRes = await request('/api/admin/coupons', 'POST', {
    code: 'TEST20',
    type: 'PERCENTAGE',
    value: 20,
    minimumOrder: 500,
    maximumDiscount: 150,
    expiry: futureDate,
    eligibleRole: 'ALL',
    description: '20% off with max cap of 150'
  }, adminH);

  console.log('[TEST 1a] Create Percentage Coupon Status:', createPercRes.status);
  console.log('[TEST 1a] Coupon Code:', createPercRes.body.data?.coupon?.code);

  // 1b. Flat Coupon
  const createFlatRes = await request('/api/admin/coupons', 'POST', {
    code: 'FLAT100',
    type: 'FLAT',
    value: 100,
    minimumOrder: 600,
    expiry: futureDate,
    eligibleRole: 'ALL'
  }, adminH);

  console.log('[TEST 1b] Create Flat Coupon Status:', createFlatRes.status);

  // 1c. Duplicate Code Guard
  const dupCodeRes = await request('/api/admin/coupons', 'POST', {
    code: 'TEST20',
    type: 'PERCENTAGE',
    value: 20,
    expiry: futureDate
  }, adminH);

  console.log('[TEST 1c] Duplicate Coupon Code Status:', dupCodeRes.status);
  console.log('[TEST 1c] Duplicate Error Code:', dupCodeRes.body.code);

  if (
    createPercRes.status === 201 &&
    createFlatRes.status === 201 &&
    dupCodeRes.status === 409 &&
    dupCodeRes.body.code === 'DUPLICATE_CODE'
  ) {
    console.log('✅ TEST 1 PASSED: Admin created Percentage & Flat coupons; duplicate code rejected.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // ── TEST 2: Authoritative Backend Coupon Validation ───────────────────────
  // 2a. Percentage discount with cap (20% of 1000 = 200, capped at 150)
  const valCapRes = await request('/api/coupons/validate', 'POST', {
    code: 'TEST20',
    subtotal: 1000
  }, custH);

  console.log('[TEST 2a] Percentage Validation Status:', valCapRes.status);
  console.log('[TEST 2a] Calculated Discount Amount:', valCapRes.body.data?.coupon?.discountAmount);

  // 2b. Flat discount (100 off 800 = 100)
  const valFlatRes = await request('/api/coupons/validate', 'POST', {
    code: 'FLAT100',
    subtotal: 800
  }, custH);

  console.log('[TEST 2b] Flat Validation Status:', valFlatRes.status);
  console.log('[TEST 2b] Calculated Flat Discount:', valFlatRes.body.data?.coupon?.discountAmount);

  if (
    valCapRes.status === 200 &&
    valCapRes.body.data?.coupon?.discountAmount === 150 &&
    valFlatRes.status === 200 &&
    valFlatRes.body.data?.coupon?.discountAmount === 100
  ) {
    console.log('✅ TEST 2 PASSED: Server authoritatively computed Percentage (with max cap) and Flat discounts.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // ── TEST 3: Backend Security Guards (Min Order, Expiry, Role) ─────────────
  // 3a. Minimum Order Unmet (subtotal 400 < min 500)
  const minOrderRes = await request('/api/coupons/validate', 'POST', {
    code: 'TEST20',
    subtotal: 400
  }, custH);

  console.log('[TEST 3a] Minimum Order Unmet Status:', minOrderRes.status);
  console.log('[TEST 3a] Error Code:', minOrderRes.body.code);

  // 3b. Expired Coupon
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  await Coupon.create({
    code: 'EXPIRED10',
    type: 'PERCENTAGE',
    value: 10,
    expiry: pastDate,
    isActive: true
  });

  const expiredRes = await request('/api/coupons/validate', 'POST', {
    code: 'EXPIRED10',
    subtotal: 1000
  }, custH);

  console.log('[TEST 3b] Expired Coupon Status:', expiredRes.status);
  console.log('[TEST 3b] Error Code:', expiredRes.body.code);

  // 3c. Role Restriction Guard (B2B only coupon attempted by Customer)
  await Coupon.create({
    code: 'B2BONLY',
    type: 'PERCENTAGE',
    value: 30,
    expiry: futureDate,
    eligibleRole: 'B2B_WHOLESALER',
    isActive: true
  });

  const roleGuardRes = await request('/api/coupons/validate', 'POST', {
    code: 'B2BONLY',
    subtotal: 1000
  }, custH);

  console.log('[TEST 3c] Role Restriction Guard Status:', roleGuardRes.status);
  console.log('[TEST 3c] Error Code:', roleGuardRes.body.code);

  if (
    minOrderRes.status === 400 && minOrderRes.body.code === 'MINIMUM_ORDER_UNMET' &&
    expiredRes.status === 400 && expiredRes.body.code === 'COUPON_EXPIRED' &&
    roleGuardRes.status === 403 && roleGuardRes.body.code === 'ROLE_NOT_ELIGIBLE'
  ) {
    console.log('✅ TEST 3 PASSED: Backend strictly enforced Minimum Order, Expiry, and Role eligibility guards.\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── TEST 4: Admin Coupon CRUD & Audit Logging ─────────────────────────────
  const couponId = createPercRes.body.data?.coupon?._id;
  const updateCouponRes = await request(`/api/admin/coupons/${couponId}`, 'PUT', {
    value: 25,
    description: 'Updated to 25% discount'
  }, adminH);

  console.log('[TEST 4] Admin Update Coupon Status:', updateCouponRes.status);
  console.log('[TEST 4] Updated Value:', updateCouponRes.body.data?.coupon?.value);

  const couponAudit = await AuditLog.findOne({ resourceType: 'Coupon', resourceId: String(couponId) });
  console.log('[TEST 4] Coupon AuditLog created:', !!couponAudit);

  if (updateCouponRes.status === 200 && updateCouponRes.body.data?.coupon?.value === 25 && couponAudit) {
    console.log('✅ TEST 4 PASSED: Admin updated coupon with audit logging.\n');
  } else {
    console.error('❌ TEST 4 FAILED'); process.exit(1);
  }

  // ── TEST 5: Banner Creation & Public Active Filtering ─────────────────────
  // Create 1 active banner and 1 inactive draft banner
  const activeBannerRes = await request('/api/admin/banners', 'POST', {
    title: 'TEST Active Festival Hero Banner',
    subtitle: 'Crispy makhana handcrafted fresh',
    image: 'https://example.com/banner-active.jpg',
    ctaText: 'Shop Festival Picks',
    ctaUrl: '/shop?category=roasted-makhana',
    displayOrder: 1,
    isActive: true
  }, adminH);

  const draftBannerRes = await request('/api/admin/banners', 'POST', {
    title: 'TEST Draft Inactive Banner',
    image: 'https://example.com/banner-draft.jpg',
    isActive: false
  }, adminH);

  console.log('[TEST 5] Active Banner Create Status:', activeBannerRes.status);
  console.log('[TEST 5] Draft Banner Create Status:', draftBannerRes.status);

  // Public fetch should return ONLY active banner
  const publicBannersRes = await request('/api/banners', 'GET');
  console.log('[TEST 5] Public Banners Status:', publicBannersRes.status);
  const liveBanners = publicBannersRes.body.data?.banners || [];
  console.log('[TEST 5] Live banners count:', liveBanners.length);

  const hasDraft = liveBanners.some((b) => b.title === 'TEST Draft Inactive Banner');
  const hasActive = liveBanners.some((b) => b.title === 'TEST Active Festival Hero Banner');

  if (publicBannersRes.status === 200 && hasActive && !hasDraft) {
    console.log('✅ TEST 5 PASSED: Public banner endpoint returns only active banners within valid dates.\n');
  } else {
    console.error('❌ TEST 5 FAILED: Inactive banner leaked to public'); process.exit(1);
  }

  // ── TEST 6: Admin Banner Management ───────────────────────────────────────
  const activeBannerId = activeBannerRes.body.data?.banner?._id;
  const bannerUpdateRes = await request(`/api/admin/banners/${activeBannerId}`, 'PUT', {
    title: 'TEST Updated Banner Title'
  }, adminH);

  console.log('[TEST 6] Admin Banner Update Status:', bannerUpdateRes.status);

  const bannerAudit = await AuditLog.findOne({ resourceType: 'Banner', resourceId: String(activeBannerId) });
  console.log('[TEST 6] Banner AuditLog created:', !!bannerAudit);

  if (bannerUpdateRes.status === 200 && bannerAudit) {
    console.log('✅ TEST 6 PASSED: Admin updated banner with audit logging.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Promotional Ads by Placement (HOMEPAGE, SHOP, PRODUCT_PAGE) ───
  const shopAdRes = await request('/api/admin/ads', 'POST', {
    title: 'TEST Shop Catalog Super Deal',
    description: 'Buy 2 Get 1 Free on all Cookies',
    image: 'https://example.com/ad-shop.jpg',
    placement: 'SHOP',
    link: '/shop?category=artisan-cookies',
    isActive: true
  }, adminH);

  const homeAdRes = await request('/api/admin/ads', 'POST', {
    title: 'TEST Homepage Spotlight',
    description: 'Explore our farm-fresh peri peri makhana',
    image: 'https://example.com/ad-home.jpg',
    placement: 'HOMEPAGE',
    link: '/products/peri-peri-makhana',
    isActive: true
  }, adminH);

  console.log('[TEST 7] Shop Ad Create Status:', shopAdRes.status);
  console.log('[TEST 7] Home Ad Create Status:', homeAdRes.status);

  // Query SHOP placement
  const queryShopRes = await request('/api/ads?placement=SHOP', 'GET');
  console.log('[TEST 7] Query SHOP Ads Status:', queryShopRes.status);
  const shopAds = queryShopRes.body.data?.ads || [];
  console.log('[TEST 7] SHOP placement ads count:', shopAds.length);

  const allShop = shopAds.every((a) => a.placement === 'SHOP');

  if (queryShopRes.status === 200 && shopAds.length >= 1 && allShop) {
    console.log('✅ TEST 7 PASSED: Non-intrusive promotional ads created and queried by placement.\n');
  } else {
    console.error('❌ TEST 7 FAILED: Placement filtering failed'); process.exit(1);
  }

  // ── TEST 8: Admin Ad Management & Audit Logging ───────────────────────────
  const shopAdId = shopAdRes.body.data?.ad?._id;
  const adUpdateRes = await request(`/api/admin/ads/${shopAdId}`, 'PUT', {
    description: 'Updated promotion text'
  }, adminH);

  console.log('[TEST 8] Admin Ad Update Status:', adUpdateRes.status);

  const adAudit = await AuditLog.findOne({ resourceType: 'Ad', resourceId: String(shopAdId) });
  console.log('[TEST 8] Ad AuditLog created:', !!adAudit);

  if (adUpdateRes.status === 200 && adAudit) {
    console.log('✅ TEST 8 PASSED: Admin updated promotional advertisement with audit logging.\n');
  } else {
    console.error('❌ TEST 8 FAILED'); process.exit(1);
  }

  console.log('🎉 ALL 8 MODULE 23 MARKETING SYSTEM VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runMarketingTests().catch((err) => {
  console.error('FATAL MARKETING TEST ERROR:', err);
  process.exit(1);
});
