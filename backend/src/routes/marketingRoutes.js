const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  adminGetAllCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
  getActiveBanners,
  adminGetAllBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  getActiveAds,
  adminGetAllAds,
  adminCreateAd,
  adminUpdateAd,
  adminDeleteAd,
  adminGetBroadcastAudienceStats,
  adminGetBroadcastRecipients,
  adminBroadcastAdWhatsApp
} = require('../controllers/marketingController');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { clearCacheOnMutation } = require('../middleware/cacheMiddleware');

// ── PUBLIC ROUTES ────────────────────────────────────────────────────────────
router.post('/coupons/validate', optionalAuth, validateCoupon);
router.get('/banners', getActiveBanners);
router.get('/ads', getActiveAds);

// ── ADMIN MARKETING ROUTES ───────────────────────────────────────────────────
// Coupons
router.get('/admin/coupons', requireAuth, requireAdmin, adminGetAllCoupons);
router.post('/admin/coupons', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminCreateCoupon);
router.put('/admin/coupons/:id', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminUpdateCoupon);
router.delete('/admin/coupons/:id', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminDeleteCoupon);

// Banners — invalidate /banners cache immediately on any mutation
router.get('/admin/banners', requireAuth, requireAdmin, adminGetAllBanners);
router.post('/admin/banners', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminCreateBanner);
router.put('/admin/banners/:id', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminUpdateBanner);
router.delete('/admin/banners/:id', requireAuth, requireAdmin, clearCacheOnMutation('/banners'), adminDeleteBanner);

// Ads — invalidate /ads cache immediately on any mutation
router.get('/admin/ads', requireAuth, requireAdmin, adminGetAllAds);
router.post('/admin/ads', requireAuth, requireAdmin, clearCacheOnMutation('/ads'), adminCreateAd);
router.put('/admin/ads/:id', requireAuth, requireAdmin, clearCacheOnMutation('/ads'), adminUpdateAd);
router.delete('/admin/ads/:id', requireAuth, requireAdmin, clearCacheOnMutation('/ads'), adminDeleteAd);

// ── Real-Time WhatsApp Marketing Broadcasts ──────────────────────────────────
router.get('/admin/broadcast/stats', requireAuth, requireAdmin, adminGetBroadcastAudienceStats);
router.get('/admin/broadcast/recipients', requireAuth, requireAdmin, adminGetBroadcastRecipients);
router.post('/admin/ads/:id/broadcast', requireAuth, requireAdmin, adminBroadcastAdWhatsApp);
router.post('/admin/broadcast', requireAuth, requireAdmin, adminBroadcastAdWhatsApp);

module.exports = router;

