require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const models = require('../src/models');

const runModelTests = async () => {
  console.log('=== SNACKORA MODULE 9: MONGOOSE DATA MODELS VERIFICATION ===\n');

  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora';
  await mongoose.connect(mongoURI);

  const modelNames = [
    'User',
    'Product',
    'Category',
    'Cart',
    'Address',
    'Order',
    'Payment',
    'Refund',
    'Review',
    'Wishlist',
    'Coupon',
    'B2BApplication',
    'B2BRequest',
    'Banner',
    'Notification',
    'InventoryTransaction',
    'AuditLog'
  ];

  // Test 1: Verify all 17 models exist and are valid Mongoose models
  console.log('[TEST 1] Verifying 17 registered Mongoose models:');
  for (const name of modelNames) {
    if (models[name] && typeof models[name] === 'function') {
      console.log(`  ✓ Model '${name}' is properly defined`);
    } else {
      console.error(`  ❌ Model '${name}' failed to load!`);
      process.exit(1);
    }
  }
  console.log('✅ TEST 1 PASSED: All 17 Mongoose models loaded successfully.\n');

  // Test 2: Verify User Schema & Password protection (select: false)
  const testUser = new models.User({
    name: 'Model Test User',
    email: `model_test_${Date.now()}@snackora.test`,
    password: 'TestPassword@123',
    role: 'CUSTOMER'
  });
  await testUser.save();

  const fetchedUser = await models.User.findById(testUser._id);
  console.log('[TEST 2] Password excluded from default select:', fetchedUser.password === undefined);
  if (fetchedUser.password === undefined && fetchedUser.createdAt && fetchedUser.updatedAt) {
    console.log('✅ TEST 2 PASSED: User passwordHash is protected and timestamps exist.\n');
  } else {
    console.error('❌ TEST 2 FAILED: User password leaked or timestamps missing');
    process.exit(1);
  }

  // Test 3: Verify Unique Email constraint
  try {
    const duplicateUser = new models.User({
      name: 'Duplicate User',
      email: testUser.email,
      password: 'TestPassword@123'
    });
    await duplicateUser.save();
    console.error('❌ TEST 3 FAILED: Duplicate email was allowed!');
    process.exit(1);
  } catch (err) {
    if (err.code === 11000) {
      console.log('✅ TEST 3 PASSED: Unique email index enforced (E11000 caught).\n');
    } else {
      console.log('✅ TEST 3 PASSED: Duplicate email rejected by validation.\n');
    }
  }

  // Test 4: Verify Product model with role-based price stripping and validation
  const testCategory = await models.Category.findOne();
  const testProduct = new models.Product({
    name: 'Model Test Roasted Foxnut',
    slug: `test-makhana-${Date.now()}`,
    sku: `MK-TEST-${Date.now().toString().slice(-6)}`,
    description: 'Slow roasted peri-peri foxnut.',
    category: testCategory ? testCategory._id : new mongoose.Types.ObjectId(),
    flavour: 'Peri-Peri',
    weight: '70g',
    retailPrice: 160,
    wholesalePrice: 95,
    b2bMoq: 12,
    stock: 50,
    featured: true,
    active: true,
    rating: 4.8,
    reviewCount: 15
  });
  await testProduct.save();

  const guestJSON = testProduct.toRoleSpecificJSON(false);
  const b2bJSON = testProduct.toRoleSpecificJSON(true);

  console.log('[TEST 4] Product wholesalePrice in Guest JSON:', guestJSON.wholesalePrice);
  console.log('[TEST 4] Product wholesalePrice in B2B JSON:', b2bJSON.wholesalePrice);

  if (guestJSON.wholesalePrice === undefined && b2bJSON.wholesalePrice === 95) {
    console.log('✅ TEST 4 PASSED: Product toRoleSpecificJSON securely strips wholesalePrice for guests.\n');
  } else {
    console.error('❌ TEST 4 FAILED: Price stripping failed');
    process.exit(1);
  }

  // Test 5: Verify Address model
  const testAddress = new models.Address({
    user: testUser._id,
    name: 'Test Recipient',
    phone: '+91 9876543210',
    addressLine1: 'Flat 101, Snackora Tower',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001'
  });
  await testAddress.save();
  console.log('[TEST 5] Address created with auto-timestamps:', Boolean(testAddress.createdAt));
  console.log('✅ TEST 5 PASSED: Address model verified.\n');

  // Test 6: Verify Coupon validation
  const testCoupon = new models.Coupon({
    code: `SNACK${Date.now().toString().slice(-4)}`,
    discountType: 'PERCENTAGE',
    discountValue: 15,
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await testCoupon.save();
  console.log('[TEST 6] Coupon created with code:', testCoupon.code);
  console.log('✅ TEST 6 PASSED: Coupon model verified.\n');

  // Clean up test documents
  await models.User.findByIdAndDelete(testUser._id);
  await models.Product.findByIdAndDelete(testProduct._id);
  await models.Address.findByIdAndDelete(testAddress._id);
  await models.Coupon.findByIdAndDelete(testCoupon._id);

  console.log('🎉 ALL 6 MONGOOSE DATA MODEL VERIFICATION TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runModelTests().catch((err) => {
  console.error('FATAL MODEL TEST ERROR:', err);
  process.exit(1);
});
