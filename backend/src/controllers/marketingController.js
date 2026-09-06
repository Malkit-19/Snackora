const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const Ad = require('../models/Ad');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');
const { createInAppNotification } = require('./notificationController');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

// ─────────────────────────────────────────────────────────────────────────────
// 1. COUPON CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public/Auth: POST /api/coupons/validate
 * Validates coupon code against cart subtotal and user role
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code) {
      return sendError(res, 'Coupon code is required.', 400, 'VALIDATION_ERROR');
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      isActive: true
    });

    if (!coupon) {
      return sendError(res, 'Invalid or expired coupon code.', 404, 'COUPON_NOT_FOUND');
    }

    const now = new Date();
    if (coupon.expiry && new Date(coupon.expiry) < now) {
      return sendError(res, 'This coupon code has expired.', 400, 'COUPON_EXPIRED');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return sendError(res, 'This coupon has reached its maximum global usage limit.', 400, 'COUPON_LIMIT_REACHED');
    }

    // Role check if authenticated
    if (req.user && coupon.eligibleRole !== 'ALL') {
      const userRole = req.user.role === 'B2B_WHOLESALER' ? 'B2B_WHOLESALER' : 'CUSTOMER';
      if (coupon.eligibleRole !== userRole && req.user.role !== 'ADMIN') {
        return sendError(
          res,
          `This coupon is only valid for ${coupon.eligibleRole} accounts.`,
          403,
          'ROLE_NOT_ELIGIBLE'
        );
      }
    }

    // Per-user usage check if authenticated
    if (req.user && coupon.perUserLimit && Array.isArray(coupon.usedBy)) {
      const userUsageCount = coupon.usedBy.filter(
        (u) => u.user && u.user.toString() === req.user._id.toString()
      ).length;

      if (userUsageCount >= coupon.perUserLimit) {
        return sendError(
          res,
          `You have already used this coupon the maximum allowed (${coupon.perUserLimit}) time(s).`,
          400,
          'PER_USER_LIMIT_EXCEEDED'
        );
      }
    }

    const cartSubtotal = Number(subtotal);
    if (coupon.minimumOrder && cartSubtotal < coupon.minimumOrder) {
      return sendError(
        res,
        `Minimum order subtotal of ₹${coupon.minimumOrder} is required to use this coupon.`,
        400,
        'MINIMUM_ORDER_UNMET',
        { minimumOrder: coupon.minimumOrder, currentSubtotal: cartSubtotal }
      );
    }

    // Calculate authoritative discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = Math.round((cartSubtotal * coupon.value) / 100);
      if (coupon.maximumDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
      }
    } else {
      // FLAT
      discountAmount = Math.min(coupon.value, cartSubtotal);
    }

    return sendSuccess(res, `Coupon '${coupon.code}' applied successfully!`, {
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
        minimumOrder: coupon.minimumOrder
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/admin/coupons
 */
const adminGetAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'Coupons retrieved.', { coupons, total: coupons.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/admin/coupons
 */
const adminCreateCoupon = async (req, res, next) => {
  try {
    const {
      code,
      type = 'PERCENTAGE',
      value,
      minimumOrder = 0,
      maximumDiscount = null,
      expiry,
      usageLimit = 1000,
      perUserLimit = 1,
      eligibleRole = 'ALL',
      description = '',
      isActive = true
    } = req.body;

    if (!code || !code.trim()) {
      return sendError(res, 'Coupon code is required.', 400, 'VALIDATION_ERROR');
    }
    if (value === undefined || isNaN(Number(value)) || Number(value) < 0) {
      return sendError(res, 'Valid discount value is required.', 400, 'VALIDATION_ERROR');
    }
    const expDate = expiry || req.body.expiryDate;
    if (!expDate) {
      return sendError(res, 'Coupon expiry date is required.', 400, 'VALIDATION_ERROR');
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return sendError(res, `Coupon code '${cleanCode}' already exists.`, 409, 'DUPLICATE_CODE');
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      type: type.toUpperCase(),
      value: Number(value),
      minimumOrder: Number(minimumOrder) || 0,
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
      expiry: new Date(expDate),
      usageLimit: Number(usageLimit) || 1000,
      perUserLimit: Number(perUserLimit) || 1,
      eligibleRole: eligibleRole.toUpperCase(),
      description: description.trim(),
      isActive: Boolean(isActive)
    });

    await createAuditLog({
      req,
      action: 'COUPON_CREATED',
      resourceType: 'Coupon',
      resourceId: coupon._id,
      changes: { code: coupon.code, value: coupon.value, type: coupon.type }
    });

    return sendSuccess(res, `Coupon '${coupon.code}' created successfully.`, { coupon }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PUT /api/admin/coupons/:id
 */
const adminUpdateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return sendError(res, 'Coupon not found.', 404, 'NOT_FOUND');
    }

    const beforeState = coupon.toObject();
    const updates = req.body;

    if (updates.code) coupon.code = updates.code.toUpperCase().trim();
    if (updates.type) coupon.type = updates.type.toUpperCase();
    if (updates.value !== undefined) coupon.value = Number(updates.value);
    if (updates.minimumOrder !== undefined) coupon.minimumOrder = Number(updates.minimumOrder);
    if (updates.maximumDiscount !== undefined) coupon.maximumDiscount = updates.maximumDiscount ? Number(updates.maximumDiscount) : null;
    if (updates.expiry) coupon.expiry = new Date(updates.expiry);
    if (updates.usageLimit !== undefined) coupon.usageLimit = Number(updates.usageLimit);
    if (updates.perUserLimit !== undefined) coupon.perUserLimit = Number(updates.perUserLimit);
    if (updates.eligibleRole) coupon.eligibleRole = updates.eligibleRole.toUpperCase();
    if (updates.description !== undefined) coupon.description = updates.description.trim();
    if (updates.isActive !== undefined) coupon.isActive = Boolean(updates.isActive);

    await coupon.save();

    await createAuditLog({
      req,
      action: 'COUPON_UPDATED',
      resourceType: 'Coupon',
      resourceId: coupon._id,
      changes: { before: beforeState, after: coupon.toObject() }
    });

    return sendSuccess(res, `Coupon '${coupon.code}' updated successfully.`, { coupon });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: DELETE /api/admin/coupons/:id
 */
const adminDeleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return sendError(res, 'Coupon not found.', 404, 'NOT_FOUND');
    }

    await coupon.deleteOne();

    await createAuditLog({
      req,
      action: 'COUPON_DELETED',
      resourceType: 'Coupon',
      resourceId: id,
      changes: { code: coupon.code }
    });

    return sendSuccess(res, `Coupon '${coupon.code}' deleted.`, { deletedCouponId: id });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BANNER CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: GET /api/banners
 * Homepage displays ONLY active banners currently within date range
 */
const getActiveBanners = async (req, res, next) => {
  try {
    const { random } = req.query;
    const now = new Date();
    const query = {
      isActive: true,
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    };

    let banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
    if (!banners || banners.length === 0) {
      banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    }

    // Randomize rotation if requested
    if (random === 'true' && banners.length > 1) {
      banners = banners.sort(() => Math.random() - 0.5);
    }

    return sendSuccess(res, 'Active banners retrieved.', { banners });
  } catch (error) {
    next(error);
  }
};



/**
 * Admin: GET /api/admin/banners
 */
const adminGetAllBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    return sendSuccess(res, 'All banners retrieved.', { banners, total: banners.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/admin/banners
 */
const adminCreateBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle = '',
      image,
      imageUrl,
      ctaText = 'Shop Now',
      cta = 'Shop Now',
      ctaUrl = '/shop',
      ctaLink = '/shop',
      startDate = new Date(),
      endDate = null,
      isActive = true,
      displayOrder = 0
    } = req.body;

    const bannerImage = image || imageUrl;
    if (!title || !bannerImage) {
      return sendError(res, 'Banner title and image are required.', 400, 'VALIDATION_ERROR');
    }

    const banner = await Banner.create({
      title: title.trim(),
      subtitle: subtitle.trim(),
      image: bannerImage.trim(),
      ctaText: (ctaText || cta).trim(),
      ctaUrl: (ctaUrl || ctaLink).trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: Boolean(isActive),
      displayOrder: Number(displayOrder) || 0
    });

    await createAuditLog({
      req,
      action: 'BANNER_CREATED',
      resourceType: 'Banner',
      resourceId: banner._id,
      changes: { title: banner.title, image: banner.image }
    });

    return sendSuccess(res, 'Banner created successfully.', { banner }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PUT /api/admin/banners/:id
 */
const adminUpdateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) {
      return sendError(res, 'Banner not found.', 404, 'NOT_FOUND');
    }

    const beforeState = banner.toObject();
    const updates = req.body;

    if (updates.title !== undefined) banner.title = updates.title.trim();
    if (updates.subtitle !== undefined) banner.subtitle = updates.subtitle.trim();
    if (updates.image || updates.imageUrl) banner.image = (updates.image || updates.imageUrl).trim();
    if (updates.ctaText || updates.cta) banner.ctaText = (updates.ctaText || updates.cta).trim();
    if (updates.ctaUrl || updates.ctaLink) banner.ctaUrl = (updates.ctaUrl || updates.ctaLink).trim();
    if (updates.startDate) banner.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined) banner.endDate = updates.endDate ? new Date(updates.endDate) : null;
    if (updates.isActive !== undefined) banner.isActive = Boolean(updates.isActive);
    if (updates.displayOrder !== undefined) banner.displayOrder = Number(updates.displayOrder);

    await banner.save();

    await createAuditLog({
      req,
      action: 'BANNER_UPDATED',
      resourceType: 'Banner',
      resourceId: banner._id,
      changes: { before: beforeState, after: banner.toObject() }
    });

    return sendSuccess(res, 'Banner updated successfully.', { banner });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: DELETE /api/admin/banners/:id
 */
const adminDeleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) {
      return sendError(res, 'Banner not found.', 404, 'NOT_FOUND');
    }

    await banner.deleteOne();

    await createAuditLog({
      req,
      action: 'BANNER_DELETED',
      resourceType: 'Banner',
      resourceId: id,
      changes: { title: banner.title }
    });

    return sendSuccess(res, 'Banner deleted.', { deletedBannerId: id });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADS CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: GET /api/ads?placement=HOMEPAGE|SHOP|PRODUCT_PAGE
 * Returns non-intrusive active advertisements
 */
const getActiveAds = async (req, res, next) => {
  try {
    const { placement, random } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    };

    if (placement) {
      query.placement = placement.toUpperCase();
    }

    let ads = await Ad.find(query).sort({ createdAt: -1 });
    if ((!ads || ads.length === 0) && placement) {
      ads = await Ad.find({ isActive: true, placement: placement.toUpperCase() }).sort({ createdAt: -1 });
    }

    // Randomize rotation if requested
    if (random === 'true' && ads.length > 1) {
      ads = ads.sort(() => Math.random() - 0.5);
    }

    return sendSuccess(res, 'Active ads retrieved.', { ads });
  } catch (error) {
    next(error);
  }
};



/**
 * Admin: GET /api/admin/ads
 */
const adminGetAllAds = async (req, res, next) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    return sendSuccess(res, 'All ads retrieved.', { ads, total: ads.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/admin/ads
 */
const adminCreateAd = async (req, res, next) => {
  try {
    const {
      title,
      description = '',
      image,
      link = '/shop',
      placement = 'HOMEPAGE',
      startDate = new Date(),
      endDate = null,
      isActive = true
    } = req.body;

    if (!title || !image) {
      return sendError(res, 'Ad title and image are required.', 400, 'VALIDATION_ERROR');
    }

    const validPlacements = ['HOMEPAGE', 'SHOP', 'PRODUCT_PAGE'];
    const cleanPlacement = placement.toUpperCase();
    if (!validPlacements.includes(cleanPlacement)) {
      return sendError(
        res,
        `Invalid placement. Allowed: ${validPlacements.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const ad = await Ad.create({
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      link: link.trim(),
      placement: cleanPlacement,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: Boolean(isActive)
    });

    // Optional Real-Time WhatsApp Broadcast on Ad Creation
    let broadcastSummary = null;
    if (req.body.autoBroadcast) {
      (async () => {
        try {
          const couponCode = req.body.couponCode || '';
          const users = await User.find({
            phone: { $exists: true, $ne: '' },
            whatsappOptIn: { $ne: false }
          }).select('name phone').lean();

          for (const u of users) {
            const cleanPhone = whatsappService.normalizePhoneNumber(u.phone);
            if (!cleanPhone) continue;
            whatsappService.sendPromotionalBroadcast({
              to: cleanPhone,
              userName: u.name || 'Friend',
              title: ad.title,
              description: ad.description,
              link: ad.link,
              couponCode,
              mediaUrl: ad.image
            }).catch(() => {});

            createInAppNotification({
              userId: u._id,
              type: 'PROMOTION',
              title: `🎁 ${ad.title}`,
              message: ad.description || 'Special promotion alert from Snackora! Check out the latest deals.',
              link: ad.link,
              metadata: { promoTitle: ad.title, couponCode }
            }).catch(() => {});
          }
        } catch (bErr) {
          console.warn('[Auto-Broadcast Warning]:', bErr.message);
        }
      })();
    }

    await createAuditLog({
      req,
      action: 'AD_CREATED',
      resourceType: 'Ad',
      resourceId: ad._id,
      changes: { title: ad.title, placement: ad.placement, autoBroadcast: Boolean(req.body.autoBroadcast) }
    });

    return sendSuccess(res, 'Ad created successfully.' + (req.body.autoBroadcast ? ' Real-time WhatsApp broadcast initiated.' : ''), { ad }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PUT /api/admin/ads/:id
 */
const adminUpdateAd = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return sendError(res, 'Ad not found.', 404, 'NOT_FOUND');
    }

    const beforeState = ad.toObject();
    const updates = req.body;

    if (updates.title !== undefined) ad.title = updates.title.trim();
    if (updates.description !== undefined) ad.description = updates.description.trim();
    if (updates.image !== undefined) ad.image = updates.image.trim();
    if (updates.link !== undefined) ad.link = updates.link.trim();
    if (updates.placement) ad.placement = updates.placement.toUpperCase();
    if (updates.startDate) ad.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined) ad.endDate = updates.endDate ? new Date(updates.endDate) : null;
    if (updates.isActive !== undefined) ad.isActive = Boolean(updates.isActive);

    await ad.save();

    await createAuditLog({
      req,
      action: 'AD_UPDATED',
      resourceType: 'Ad',
      resourceId: ad._id,
      changes: { before: beforeState, after: ad.toObject() }
    });

    return sendSuccess(res, 'Ad updated successfully.', { ad });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: DELETE /api/admin/ads/:id
 */
const adminDeleteAd = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return sendError(res, 'Ad not found.', 404, 'NOT_FOUND');
    }

    await ad.deleteOne();

    await createAuditLog({
      req,
      action: 'AD_DELETED',
      resourceType: 'Ad',
      resourceId: id,
      changes: { title: ad.title }
    });

    return sendSuccess(res, 'Ad deleted.', { deletedAdId: id });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/v1/marketing/admin/broadcast/stats
 * Returns total registered users with phone numbers categorized by role
 */
const adminGetBroadcastAudienceStats = async (req, res, next) => {
  try {
    const totalWithPhone = await User.countDocuments({ phone: { $exists: true, $ne: '' } });
    const customersCount = await User.countDocuments({ phone: { $exists: true, $ne: '' }, role: 'CUSTOMER' });
    const b2bCount = await User.countDocuments({ phone: { $exists: true, $ne: '' }, role: 'B2B_WHOLESALER' });
    const optedInCount = await User.countDocuments({ phone: { $exists: true, $ne: '' }, whatsappOptIn: { $ne: false } });

    const hasCloudGateway = Boolean(
      (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) ||
      (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    );

    return sendSuccess(res, 'Broadcast audience statistics retrieved.', {
      totalWithPhone,
      customersCount,
      b2bCount,
      optedInCount,
      hasCloudGateway
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/v1/marketing/admin/broadcast/recipients
 * Returns registered users with phones for previewing broadcast lists
 */
const adminGetBroadcastRecipients = async (req, res, next) => {
  try {
    const audience = (req.query.audience || 'ALL').toUpperCase();
    const query = {
      phone: { $exists: true, $ne: '' },
      whatsappOptIn: { $ne: false }
    };

    if (audience === 'CUSTOMERS') {
      query.role = 'CUSTOMER';
    } else if (audience === 'B2B') {
      query.role = 'B2B_WHOLESALER';
    }

    const users = await User.find(query)
      .select('name phone email role createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formatted = users.map(u => ({
      _id: u._id,
      name: u.name,
      phone: u.phone,
      cleanPhone: whatsappService.normalizePhoneNumber(u.phone),
      role: u.role,
      joinedAt: u.createdAt
    }));

    return sendSuccess(res, 'Broadcast recipients retrieved.', { recipients: formatted, count: formatted.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: POST /api/v1/marketing/admin/ads/:id/broadcast OR /api/v1/marketing/admin/broadcast
 * Broadcast an Ad or custom promotional message to all registered customer phone numbers via WhatsApp in real-time
 */
const adminBroadcastAdWhatsApp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description = '',
      link = '/shop',
      couponCode = '',
      targetAudience = 'ALL',
      customMessage = ''
    } = req.body;

    let promoTitle = title;
    let promoDesc = description;
    let promoLink = link;
    let promoImage = null;

    if (id) {
      const ad = await Ad.findById(id);
      if (ad) {
        promoTitle = title || ad.title;
        promoDesc = description || ad.description;
        promoLink = link || ad.link;
        promoImage = ad.image;
      }
    }

    if (!promoTitle && !customMessage) {
      return sendError(res, 'Ad title or custom message is required for WhatsApp broadcast.', 400, 'VALIDATION_ERROR');
    }

    // 1. Query registered users with valid phone numbers from MongoDB
    const query = {
      phone: { $exists: true, $ne: '' },
      whatsappOptIn: { $ne: false }
    };

    if (targetAudience === 'CUSTOMERS') {
      query.role = 'CUSTOMER';
    } else if (targetAudience === 'B2B') {
      query.role = 'B2B_WHOLESALER';
    }

    const users = await User.find(query).select('name phone email role').lean();

    if (!users || users.length === 0) {
      return sendError(res, 'No registered users found with phone numbers for this audience.', 400, 'NO_RECIPIENTS');
    }

    // 2. Dispatch WhatsApp broadcasts & in-app notifications
    const dispatchResults = [];
    const siteBaseUrl = (req.body.baseUrl || req.get('origin') || req.get('referer')?.replace(/\/$/, '') || process.env.CLIENT_URL || 'https://www.snackora.in').replace(/\/$/, '');
    const fullLink = promoLink.startsWith('http') ? promoLink : `${siteBaseUrl}${promoLink.startsWith('/') ? promoLink : '/' + promoLink}`;
    
    // Sample composed WhatsApp message
    const sampleMsg = customMessage || `🍿 *SNACKORA SPECIAL OFFER ALERT!* 🍿

🔥 *${promoTitle}*
${promoDesc ? `${promoDesc}\n` : ''}${couponCode ? `🎟️ *Use Promo Code:* *${couponCode}*\n` : ''}
👉 *Shop Delicious Treats Now:* ${fullLink}

🚚 *Why Snackora?*
• 100% Handcrafted Makhana, Gourmet Cookies & Amul Dairy
• Instant UPI QR & Cash on Delivery Available
• Fast Delivery Direct to Your Doorstep

Enjoy guilt-free snacking! 🥜✨
_Team Snackora Gourmet Pantry_`;

    for (const user of users) {
      const cleanPhone = whatsappService.normalizePhoneNumber(user.phone);
      if (!cleanPhone) continue;

      const directChatUrl = whatsappService.generateWhatsAppLink(cleanPhone, sampleMsg);

      try {
        const sendRes = await whatsappService.sendPromotionalBroadcast({
          to: cleanPhone,
          userName: user.name || 'Friend',
          title: promoTitle,
          description: promoDesc,
          link: fullLink,
          couponCode,
          mediaUrl: promoImage
        });

        dispatchResults.push({
          userId: user._id,
          name: user.name,
          phone: cleanPhone,
          role: user.role,
          success: sendRes.success,
          provider: sendRes.provider,
          directChatUrl
        });

        // In-App Notification push
        createInAppNotification({
          userId: user._id,
          type: 'PROMOTION',
          title: `🎁 ${promoTitle}`,
          message: promoDesc || `Special promotion alert from Snackora! Check out the latest deals.`,
          link: promoLink,
          metadata: { promoTitle, couponCode }
        }).catch(() => {});
      } catch (err) {
        console.warn(`[Broadcast Failed for ${user.phone}]:`, err.message);
        dispatchResults.push({
          userId: user._id,
          name: user.name,
          phone: cleanPhone,
          role: user.role,
          success: false,
          directChatUrl
        });
      }
    }

    // Direct WhatsApp share URL for admin
    const directShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(sampleMsg)}`;

    await createAuditLog({
      req,
      action: 'WHATSAPP_BROADCAST_SENT',
      resourceType: 'Marketing',
      resourceId: id || req.user._id,
      changes: {
        title: promoTitle,
        targetAudience,
        recipientsCount: users.length,
        dispatchedCount: dispatchResults.length
      }
    });

    return sendSuccess(res, `WhatsApp broadcast successfully dispatched to ${dispatchResults.length} registered user(s).`, {
      totalTargeted: users.length,
      dispatchedCount: dispatchResults.filter(r => r.success).length || dispatchResults.length,
      directShareUrl,
      sampleMessage: sampleMsg,
      dispatchSummary: dispatchResults
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
