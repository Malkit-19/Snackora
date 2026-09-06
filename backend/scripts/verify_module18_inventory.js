/**
 * Automated Verification Suite — Module 18: Inventory Management
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

const runTests = async () => {
  console.log('=== SNACKORA MODULE 18: INVENTORY MANAGEMENT VERIFICATION ===\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snackora');
  const Product = require('../src/models/Product');
  const InventoryTransaction = require('../src/models/InventoryTransaction');

  // Authenticate Admin
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@snackora.in',
    password: 'Admin@12345'
  });
  const adminToken = adminLogin.body.data?.token;
  if (!adminToken) { console.error('❌ FATAL: Admin login failed'); process.exit(1); }
  const adminH = { Authorization: `Bearer ${adminToken}` };

  // Authenticate Customer (non-admin)
  const custLogin = await request('/api/auth/login', 'POST', {
    email: 'customer@snackora.in',
    password: 'Customer@12345'
  });
  const custToken = custLogin.body.data?.token;
  const custH = { Authorization: `Bearer ${custToken}` };

  // Grab a sample product from DB
  const sampleProduct = await Product.findOne({}).lean();
  if (!sampleProduct) { console.error('❌ FATAL: No products seeded'); process.exit(1); }
  const pid = String(sampleProduct._id);

  // ── TEST 1: BLOCK non-admin access ────────────────────────────────────────
  const custRes = await request('/api/admin/inventory', 'GET', null, custH);
  console.log('[TEST 1] Customer access to /api/admin/inventory:', custRes.status);
  if (custRes.status === 403) {
    console.log('✅ TEST 1 PASSED: Non-admin access blocked with 403 FORBIDDEN.\n');
  } else {
    console.error('❌ TEST 1 FAILED'); process.exit(1);
  }

  // ── TEST 2: Admin inventory overview ──────────────────────────────────────
  const overviewRes = await request('/api/admin/inventory', 'GET', null, adminH);
  console.log('[TEST 2] Inventory Overview Status:', overviewRes.status);
  const inventory = overviewRes.body.data?.inventory;
  const summary = overviewRes.body.data?.summary;
  console.log('[TEST 2] Products in inventory list:', inventory?.length);
  console.log('[TEST 2] Summary:', JSON.stringify(summary));

  const sampleInvItem = inventory?.find((i) => i._id === pid || i.sku === sampleProduct.sku);
  console.log('[TEST 2] Sample item availableStock field:', sampleInvItem?.availableStock);
  console.log('[TEST 2] Sample item stockStatus field:', sampleInvItem?.stockStatus);

  if (
    overviewRes.status === 200 &&
    Array.isArray(inventory) &&
    inventory.length > 0 &&
    sampleInvItem?.availableStock !== undefined &&
    sampleInvItem?.stockStatus !== undefined &&
    summary?.totalProducts >= 1
  ) {
    console.log('✅ TEST 2 PASSED: Inventory overview returns all products with availableStock & stockStatus.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', overviewRes.body);
    process.exit(1);
  }

  // ── TEST 3: availableStock formula = stock - reservedStock ────────────────
  const prevStock = sampleInvItem?.stock;
  const prevReserved = sampleInvItem?.reservedStock;
  const prevAvailable = sampleInvItem?.availableStock;
  const expectedAvailable = Math.max(prevStock - prevReserved, 0);
  console.log(`[TEST 3] stock(${prevStock}) - reserved(${prevReserved}) = expected available(${expectedAvailable}), actual(${prevAvailable})`);

  if (prevAvailable === expectedAvailable) {
    console.log('✅ TEST 3 PASSED: availableStock formula (stock − reservedStock) is correct.\n');
  } else {
    console.error('❌ TEST 3 FAILED: availableStock calculation mismatch'); process.exit(1);
  }

  // ── TEST 4: LOW_STOCK / OUT_OF_STOCK status logic ─────────────────────────
  // Temporarily set a product's stock low via DB and check status
  const tempProduct = await Product.findById(pid);
  const originalStock = tempProduct.stock;
  const threshold = tempProduct.lowStockThreshold || 10;

  // Set stock to exactly threshold — should be LOW_STOCK
  tempProduct.stock = threshold;
  await tempProduct.save();

  const lowRes = await request('/api/admin/inventory', 'GET', null, adminH);
  const lowItem = lowRes.body.data?.inventory?.find((i) => i._id === pid || i.sku === sampleProduct.sku);
  console.log(`[TEST 4] With stock=${threshold} and threshold=${threshold}, stockStatus:`, lowItem?.stockStatus);

  // Restore
  tempProduct.stock = originalStock;
  await tempProduct.save();

  if (lowItem?.stockStatus === 'LOW_STOCK' || lowItem?.stockStatus === 'OUT_OF_STOCK') {
    console.log('✅ TEST 4 PASSED: Low stock status correctly computed when stock <= threshold.\n');
  } else {
    console.error('❌ TEST 4 FAILED: Expected LOW_STOCK/OUT_OF_STOCK, got:', lowItem?.stockStatus);
    process.exit(1);
  }

  // ── TEST 5: Manual adjustment WITHOUT reason is rejected ──────────────────
  const noReasonRes = await request(`/api/admin/inventory/${pid}`, 'PATCH', {
    newStock: 500
    // no reason provided
  }, adminH);
  console.log('[TEST 5] Adjustment without reason status:', noReasonRes.status);
  console.log('[TEST 5] Error code:', noReasonRes.body.code);

  if (noReasonRes.status === 400 && noReasonRes.body.code === 'MANDATORY_REASON_REQUIRED') {
    console.log('✅ TEST 5 PASSED: Adjustment without mandatory reason rejected with 400 MANDATORY_REASON_REQUIRED.\n');
  } else {
    console.error('❌ TEST 5 FAILED:', noReasonRes.body); process.exit(1);
  }

  // ── TEST 6: Manual adjustment WITH reason succeeds ────────────────────────
  const beforeAdj = await Product.findById(pid).lean();
  const targetNewStock = beforeAdj.stock + 50;

  const adjRes = await request(`/api/admin/inventory/${pid}`, 'PATCH', {
    newStock: targetNewStock,
    type: 'ADMIN_ADJUSTMENT',
    reason: 'Module 18 test restock — verified adjustment with mandatory reason',
    lowStockThreshold: 15
  }, adminH);

  console.log('[TEST 6] Adjustment with reason status:', adjRes.status);
  console.log('[TEST 6] Product new stock:', adjRes.body.data?.product?.stock);
  console.log('[TEST 6] Product new availableStock:', adjRes.body.data?.product?.availableStock);
  console.log('[TEST 6] Transaction type:', adjRes.body.data?.transaction?.type);
  console.log('[TEST 6] Transaction reason:', adjRes.body.data?.transaction?.reason);

  if (
    adjRes.status === 200 &&
    adjRes.body.data?.product?.stock === targetNewStock &&
    adjRes.body.data?.transaction?.type === 'ADMIN_ADJUSTMENT'
  ) {
    console.log('✅ TEST 6 PASSED: Manual admin inventory adjustment succeeds with mandatory reason and ledger entry.\n');
  } else {
    console.error('❌ TEST 6 FAILED:', adjRes.body); process.exit(1);
  }

  // ── TEST 7: Block adjustment that would make available stock negative ──────
  const productForNeg = await Product.findById(pid);
  // Set reserved stock = stock (all units reserved)
  const currentStock = productForNeg.stock;
  productForNeg.reservedStock = currentStock;
  await productForNeg.save();

  const negStockRes = await request(`/api/admin/inventory/${pid}`, 'PATCH', {
    newStock: currentStock - 5, // lower than reserved → negative available
    reason: 'Attempting illegal negative stock reduction'
  }, adminH);
  console.log('[TEST 7] Negative available stock attempt status:', negStockRes.status);
  console.log('[TEST 7] Error code:', negStockRes.body.code);

  // Restore reserved stock
  productForNeg.reservedStock = beforeAdj.reservedStock || 0;
  await productForNeg.save();

  if (negStockRes.status === 400 && negStockRes.body.code === 'NEGATIVE_AVAILABLE_STOCK_BLOCKED') {
    console.log('✅ TEST 7 PASSED: Negative available stock operation safely blocked.\n');
  } else {
    console.error('❌ TEST 7 FAILED:', negStockRes.body); process.exit(1);
  }

  // ── TEST 8: Transaction ledger records are created ────────────────────────
  const ledgerRes = await request('/api/admin/inventory/transactions', 'GET', null, adminH);
  console.log('[TEST 8] Transaction ledger status:', ledgerRes.status);
  const txList = ledgerRes.body.data?.transactions;
  console.log('[TEST 8] Total transactions in ledger:', ledgerRes.body.data?.pagination?.totalTransactions);

  const recentAdminTx = txList?.find((t) => t.type === 'ADMIN_ADJUSTMENT');
  console.log('[TEST 8] Found ADMIN_ADJUSTMENT in ledger:', !!recentAdminTx);
  console.log('[TEST 8] Reason recorded:', recentAdminTx?.reason);

  if (ledgerRes.status === 200 && txList?.length >= 1 && recentAdminTx) {
    console.log('✅ TEST 8 PASSED: Transaction ledger correctly stores ADMIN_ADJUSTMENT entries with reason.\n');
  } else {
    console.error('❌ TEST 8 FAILED:', ledgerRes.body); process.exit(1);
  }

  // ── TEST 9: Mongoose virtuals on Product model ────────────────────────────
  const dbProduct = await Product.findById(pid);
  const virtualAvailable = dbProduct.availableStock;
  const virtualStatus = dbProduct.stockStatus;
  const expectedCalc = Math.max((dbProduct.stock || 0) - (dbProduct.reservedStock || 0), 0);
  console.log(`[TEST 9] Product virtual availableStock: ${virtualAvailable} (expected: ${expectedCalc})`);
  console.log(`[TEST 9] Product virtual stockStatus: ${virtualStatus}`);

  if (virtualAvailable === expectedCalc && ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(virtualStatus)) {
    console.log('✅ TEST 9 PASSED: Mongoose virtual availableStock and stockStatus computed correctly.\n');
  } else {
    console.error('❌ TEST 9 FAILED'); process.exit(1);
  }

  // ── TEST 10: Summary counters sanity check ────────────────────────────────
  const finalOverview = await request('/api/admin/inventory', 'GET', null, adminH);
  const finalSummary = finalOverview.body.data?.summary;
  console.log('[TEST 10] Final summary:', JSON.stringify(finalSummary));

  const totalCheck =
    (finalSummary?.inStockCount || 0) +
    (finalSummary?.lowStockCount || 0) +
    (finalSummary?.outOfStockCount || 0);

  if (finalSummary?.totalProducts === totalCheck) {
    console.log('✅ TEST 10 PASSED: Summary counters (IN_STOCK + LOW_STOCK + OUT_OF_STOCK = totalProducts) consistent.\n');
  } else {
    console.error(`❌ TEST 10 FAILED: totalProducts(${finalSummary?.totalProducts}) ≠ sum(${totalCheck})`);
    process.exit(1);
  }

  console.log('🎉 ALL 10 MODULE 18 INVENTORY MANAGEMENT TESTS PASSED 100%!');
  await mongoose.disconnect();
  process.exit(0);
};

runTests().catch((err) => {
  console.error('FATAL INVENTORY TEST ERROR:', err);
  process.exit(1);
});
