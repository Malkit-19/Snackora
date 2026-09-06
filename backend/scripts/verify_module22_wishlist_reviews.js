/**
 * Comprehensive Automated Verification Suite for Module 22: Wishlist + Reviews
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

const runWishlistReviewTests = async () => {
  console.log('=== SNACKORA MODULE 22: WISHLIST + REVIEWS VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const User = require('../src/models/User');
  const Product = require('../src/models/Product');
  const Order = require('../src/models/Order');
  const Wishlist = require('../src/models/Wishlist');
  const Review = require('../src/models/Review');
  const AuditLog = require('../src/models/AuditLog');

  // 1. Authenticate Customer 1 (Purchaser)
  await User.updateOne({ email: 'customer@snackora.in' }, { role: 'CUSTOMER', b2bStatus: 'NONE' });
  const cust1Login = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const cust1Token = cust1Login.body.data?.token;
  const cust1User = cust1Login.body.data?.user;
  const cust1H = { Authorization: `Bearer ${cust1Token}` };

  // 2. Authenticate Wholesaler (Non-Purchaser for customer review check)
  const cust2Login = await request('/api/auth/login', 'POST', {
    email: 'wholesaler@snackora.in',
    password: 'B2b@12345'
  });
  const cust2Token = cust2Login.body.data?.token;
  const cust2User = cust2Login.body.data?.user;
  const cust2H = { Authorization: `Bearer ${cust2Token}` };

  // Pick a sample product
  const sampleProduct = await Product.findOne({ isAvailable: true });
  const pid = String(sampleProduct._id);

  // Clear previous test reviews & wishlist for clean test run
  await Wishlist.deleteMany({ user: cust1User._id });
  await Review.deleteMany({ product: sampleProduct._id });
  await Review.syncProductRating(sampleProduct._id);

  // ── TEST 1: Wishlist Add & Duplicate Prevention ───────────────────────────
  const addWish1 = await request(`/api/wishlist/${pid}`, 'POST', null, cust1H);
  console.log('[TEST 1] Add to Wishlist Status:', addWish1.status);

  // Attempt duplicate addition
  const addWishDup = await request(`/api/wishlist/${pid}`, 'POST', null, cust1H);
  console.log('[TEST 1] Duplicate Add Status:', addWishDup.status);
  console.log('[TEST 1] Already in Wishlist flag:', addWishDup.body.data?.alreadyInWishlist);

  const checkWishlistDoc = await Wishlist.findOne({ user: cust1User._id });
  console.log('[TEST 1] Total items in DB Wishlist array:', checkWishlistDoc?.products?.length);

  if (
    addWish1.status === 201 &&
    addWishDup.status === 200 &&
    addWishDup.body.data?.alreadyInWishlist === true &&
    checkWishlistDoc?.products?.length === 1
  ) {
    console.log('✅ TEST 1 PASSED: Product added to wishlist; duplicates strictly prevented.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // ── TEST 2: Wishlist Retrieval & Deletion ──────────────────────────────────
  const getWishRes = await request('/api/wishlist', 'GET', null, cust1H);
  console.log('[TEST 2] Get Wishlist Status:', getWishRes.status);
  console.log('[TEST 2] Wishlist Products Count:', getWishRes.body.data?.wishlist?.products?.length);

  const delWishRes = await request(`/api/wishlist/${pid}`, 'DELETE', null, cust1H);
  console.log('[TEST 2] Delete from Wishlist Status:', delWishRes.status);

  const postDelWish = await Wishlist.findOne({ user: cust1User._id });
  console.log('[TEST 2] Wishlist count after removal:', postDelWish?.products?.length);

  if (
    getWishRes.status === 200 &&
    getWishRes.body.data?.wishlist?.products?.length === 1 &&
    delWishRes.status === 200 &&
    postDelWish?.products?.length === 0
  ) {
    console.log('✅ TEST 2 PASSED: Wishlist retrieval and removal working accurately.\n');
  } else {
    console.error('❌ TEST 2 FAILED'); process.exit(1);
  }

  // ── TEST 3: Verified Purchaser Guard (Non-Purchaser Rejection) ────────────
  // cust2 has not purchased this product
  await Order.deleteMany({ user: cust2User._id, 'items.product': sampleProduct._id });

  const nonPurchaserReviewRes = await request(`/api/products/${pid}/reviews`, 'POST', {
    rating: 5,
    title: 'Fake Review',
    comment: 'I never purchased this item but trying to review.'
  }, cust2H);

  console.log('[TEST 3] Non-Purchaser Review Status:', nonPurchaserReviewRes.status);
  console.log('[TEST 3] Error Code:', nonPurchaserReviewRes.body.code);

  if (
    nonPurchaserReviewRes.status === 403 &&
    nonPurchaserReviewRes.body.code === 'ONLY_VERIFIED_PURCHASERS_CAN_REVIEW'
  ) {
    console.log('✅ TEST 3 PASSED: Non-purchasers strictly blocked from reviewing (403 ONLY_VERIFIED_PURCHASERS_CAN_REVIEW).\n');
  } else {
    console.error('❌ TEST 3 FAILED'); process.exit(1);
  }

  // ── TEST 4: Verified Purchaser Review Submission ──────────────────────────
  // Ensure cust1 has an order with this product
  let cust1Order = await Order.findOne({ user: cust1User._id, 'items.product': sampleProduct._id });
  if (!cust1Order) {
    let addrRes = await request('/api/addresses', 'GET', null, cust1H);
    let sampleAddress = addrRes.body.data?.addresses?.[0];
    await request('/api/cart/items', 'POST', { productId: pid, quantity: 1 }, cust1H);
    const ordRes = await request('/api/checkout/place-order', 'POST', {
      addressId: sampleAddress._id,
      paymentMethod: 'COD'
    }, cust1H);
    cust1Order = ordRes.body.data?.order;
  }

  const reviewRes = await request(`/api/products/${pid}/reviews`, 'POST', {
    rating: 5,
    title: 'Incredible Artisan Quality!',
    comment: 'Super crisp, perfectly salted, and premium ingredients. My whole family loved it!'
  }, cust1H);

  console.log('[TEST 4] Verified Review Submission Status:', reviewRes.status);
  const createdReview = reviewRes.body.data?.review;
  console.log('[TEST 4] Created Review Rating:', createdReview?.rating);
  console.log('[TEST 4] Created Review isVerifiedPurchase:', createdReview?.isVerifiedPurchase);

  if (
    reviewRes.status === 201 &&
    createdReview?.rating === 5 &&
    createdReview?.isVerifiedPurchase === true
  ) {
    console.log('✅ TEST 4 PASSED: Verified purchaser successfully submitted product review.\n');
  } else {
    console.error('❌ TEST 4 FAILED:', reviewRes.body); process.exit(1);
  }

  // ── TEST 5: Automatic Product Rating & Review Count Synchronization ───────
  const updatedProductDoc = await Product.findById(pid);
  console.log('[TEST 5] Product ratings.average:', updatedProductDoc?.ratings?.average);
  console.log('[TEST 5] Product ratings.count:', updatedProductDoc?.ratings?.count);

  if (updatedProductDoc?.ratings?.average === 5 && updatedProductDoc?.ratings?.count === 1) {
    console.log('✅ TEST 5 PASSED: Product average rating & count automatically synchronized on Product model.\n');
  } else {
    console.error('❌ TEST 5 FAILED: Rating sync mismatch'); process.exit(1);
  }

  // ── TEST 6: Public Reviews Retrieval & Distribution Breakdown ─────────────
  const pubReviewsRes = await request(`/api/products/${pid}/reviews`, 'GET');
  console.log('[TEST 6] Public Reviews Status:', pubReviewsRes.status);
  const reviewsList = pubReviewsRes.body.data?.reviews || [];
  const reviewSummary = pubReviewsRes.body.data?.summary;
  console.log('[TEST 6] Reviews list count:', reviewsList.length);
  console.log('[TEST 6] Summary averageRating:', reviewSummary?.averageRating);
  console.log('[TEST 6] Rating Distribution:', JSON.stringify(reviewSummary?.ratingDistribution));

  if (
    pubReviewsRes.status === 200 &&
    reviewsList.length === 1 &&
    reviewSummary?.averageRating === 5 &&
    reviewSummary?.ratingDistribution?.[5] === 1
  ) {
    console.log('✅ TEST 6 PASSED: Public reviews endpoint returns reviews and 5-star distribution breakdown.\n');
  } else {
    console.error('❌ TEST 6 FAILED'); process.exit(1);
  }

  // ── TEST 7: Unauthorized Review Modification Guard ────────────────────────
  // cust2 tries to update cust1's review
  const unauthorizedEditRes = await request(`/api/reviews/${createdReview._id}`, 'PUT', {
    rating: 1,
    comment: 'Hacked review update attempt'
  }, cust2H);

  console.log('[TEST 7] Unauthorized Edit Status:', unauthorizedEditRes.status);
  console.log('[TEST 7] Error Code:', unauthorizedEditRes.body.code);

  if (unauthorizedEditRes.status === 403 && unauthorizedEditRes.body.code === 'FORBIDDEN') {
    console.log('✅ TEST 7 PASSED: Unauthorized users strictly prevented from modifying another user\'s review.\n');
  } else {
    console.error('❌ TEST 7 FAILED'); process.exit(1);
  }

  // ── TEST 8: Authorized Review Update & Recalculation ───────────────────────
  const updateReviewRes = await request(`/api/reviews/${createdReview._id}`, 'PUT', {
    rating: 4,
    title: 'Updated: Still Great!',
    comment: 'Updated to 4 stars after trying second pack.'
  }, cust1H);

  console.log('[TEST 8] Authorized Edit Status:', updateReviewRes.status);
  const recheckedProduct = await Product.findById(pid);
  console.log('[TEST 8] Rechecked Product average rating after edit:', recheckedProduct?.ratings?.average);

  if (updateReviewRes.status === 200 && recheckedProduct?.ratings?.average === 4) {
    console.log('✅ TEST 8 PASSED: Review author updated rating and Product rating recalculated to 4.0.\n');
  } else {
    console.error('❌ TEST 8 FAILED'); process.exit(1);
  }

  // ── TEST 9: Review Deletion & Rating Recalculation ─────────────────────────
  const deleteReviewRes = await request(`/api/reviews/${createdReview._id}`, 'DELETE', null, cust1H);
  console.log('[TEST 9] Delete Review Status:', deleteReviewRes.status);

  const postDeleteProduct = await Product.findById(pid);
  console.log('[TEST 9] Product ratings.count after deletion:', postDeleteProduct?.ratings?.count);
  console.log('[TEST 9] Product ratings.average after deletion:', postDeleteProduct?.ratings?.average);

  if (
    deleteReviewRes.status === 200 &&
    postDeleteProduct?.ratings?.count === 0 &&
    postDeleteProduct?.ratings?.average === 0
  ) {
    console.log('✅ TEST 9 PASSED: Review deleted and Product ratings reset back to 0 cleanly.\n');
  } else {
    console.error('❌ TEST 9 FAILED'); process.exit(1);
  }

  console.log('🎉 ALL 9 MODULE 22 WISHLIST & REVIEWS VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runWishlistReviewTests().catch((err) => {
  console.error('FATAL WISHLIST & REVIEW TEST ERROR:', err);
  process.exit(1);
});
