const mongoose = require('mongoose');
const User = require('../models/User');
const B2BApplication = require('../models/B2BApplication');
const B2BRequest = require('../models/B2BRequest');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { B2B_STATUS } = require('../config/constants');

const VALID_REQUEST_TYPES = [
  'Custom Pricing',
  'Large Order',
  'Recurring Supply',
  'Custom Packaging',
  'Product Request',
  'BULK_ORDER',
  'CUSTOM_PACKAGING',
  'DISTRIBUTORSHIP',
  'OTHER'
];

const VALID_REQUEST_STATUSES = [
  'PENDING',
  'REVIEWING',
  'ACCEPTED',
  'REJECTED',
  'COUNTER_OFFER',
  'CONVERTED_TO_ORDER',
  'OPEN',
  'IN_REVIEW',
  'QUOTED',
  'CLOSED'
];

/**
 * POST /api/b2b/apply
 * Create or update B2B Wholesaler business application
 */
const applyB2B = async (req, res, next) => {
  try {
    const {
      businessName, companyName, ownerName, businessType,
      gstNumber, gstin, mobile, phone, email,
      address, street, city, state, pincode, postalCode,
      expectedMonthlyOrder, productsInterestedIn, productsInterested, message
    } = req.body;

    const bName = (businessName || companyName || '').trim();
    const oName = (ownerName || req.user.name || '').trim();
    const bType = (businessType || 'Wholesale').trim();
    const gst = (gstNumber || gstin || '').trim().toUpperCase();
    const mob = (mobile || phone || req.user.phone || '').trim();
    const mail = (email || req.user.email || '').trim().toLowerCase();
    const str = (street || address || '').trim();
    const cty = (city || '').trim();
    const stt = (state || '').trim();
    const pin = (pincode || postalCode || '').trim();

    if (!bName) return sendError(res, 'Business/Company name is required.', 400, 'VALIDATION_ERROR');
    if (!gst || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
      return sendError(res, 'A valid 15-character Indian GSTIN is required.', 400, 'VALIDATION_ERROR');
    }
    if (!mob || !/^[6-9]\d{9}$/.test(mob)) {
      return sendError(res, 'A valid 10-digit Indian mobile number is required.', 400, 'VALIDATION_ERROR');
    }
    if (!str || !cty || !stt || !/^\d{6}$/.test(pin)) {
      return sendError(res, 'Full business address details (Street, City, State, 6-digit Pincode) are required.', 400, 'VALIDATION_ERROR');
    }

    const productsList = Array.isArray(productsInterestedIn || productsInterested)
      ? (productsInterestedIn || productsInterested)
      : typeof (productsInterestedIn || productsInterested) === 'string'
      ? (productsInterestedIn || productsInterested).split(',').map(s => s.trim())
      : [];

    // Create or update application
    let application = await B2BApplication.findOne({ user: req.user._id });
    if (application) {
      application.companyName = bName;
      application.ownerName = oName;
      application.businessType = bType;
      application.gstin = gst;
      application.phone = mob;
      application.email = mail;
      application.businessAddress = { street: str, city: cty, state: stt, postalCode: pin, country: 'India' };
      application.expectedMonthlyOrder = expectedMonthlyOrder || '₹50,000 - ₹2,000,000';
      application.productsInterested = productsList;
      application.message = message || '';
      application.status = 'PENDING';
      await application.save();
    } else {
      application = await B2BApplication.create({
        user: req.user._id,
        companyName: bName,
        ownerName: oName,
        businessType: bType,
        gstin: gst,
        phone: mob,
        email: mail,
        businessAddress: { street: str, city: cty, state: stt, postalCode: pin, country: 'India' },
        expectedMonthlyOrder: expectedMonthlyOrder || '₹50,000 - ₹2,000,000',
        productsInterested: productsList,
        message: message || '',
        status: 'PENDING'
      });
    }

    // Update User model status
    await User.findByIdAndUpdate(req.user._id, {
      role: 'B2B_WHOLESALER',
      b2bStatus: 'PENDING',
      businessName: bName,
      businessType: bType,
      gstNumber: gst,
      businessAddress: `${str}, ${cty}, ${stt} - ${pin}`,
      b2bProfile: {
        companyName: bName,
        gstin: gst,
        pan: gst.substring(2, 12),
        businessType: bType,
        verificationStatus: 'PENDING'
      }
    });

    return sendSuccess(res, 'B2B Wholesale application submitted successfully. Verification is in progress.', {
      application
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/b2b/status
 * Get status of current user's B2B application
 */
const getB2BStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('role b2bStatus businessName gstNumber b2bProfile');
    const application = await B2BApplication.findOne({ user: req.user._id }).sort({ createdAt: -1 });

    return sendSuccess(res, 'B2B application status retrieved.', {
      role: user.role,
      b2bStatus: user.b2bStatus || 'NONE',
      isApproved: user.b2bStatus === 'APPROVED',
      isPending: user.b2bStatus === 'PENDING',
      businessName: user.businessName,
      gstNumber: user.gstNumber,
      application
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/b2b/applications
 * Admin: List all B2B applications
 */
const adminGetApplications = async (req, res, next) => {
  try {
    // Auto-sync any B2B wholesalers who signed up directly into B2BApplication collection
    const b2bUsers = await User.find({
      $or: [
        { role: 'B2B_WHOLESALER' },
        { b2bStatus: { $in: ['PENDING', 'APPROVED', 'REJECTED'] } }
      ]
    });

    for (const u of b2bUsers) {
      const exists = await B2BApplication.findOne({ user: u._id });
      if (!exists) {
        const rawAddr = u.businessAddress || u.b2bProfile?.businessAddress;
        const formattedAddr = typeof rawAddr === 'string'
          ? { street: rawAddr, city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' }
          : {
              street: rawAddr?.street || rawAddr?.line1 || rawAddr?.addressLine1 || 'Business Premises',
              city: rawAddr?.city || 'Mumbai',
              state: rawAddr?.state || 'Maharashtra',
              postalCode: rawAddr?.postalCode || rawAddr?.pincode || '400001',
              country: rawAddr?.country || 'India'
            };

        await B2BApplication.create({
          user: u._id,
          companyName: u.businessName || u.b2bProfile?.companyName || u.name,
          ownerName: u.name,
          businessType: u.businessType || u.b2bProfile?.businessType || 'Retailer / Wholesaler',
          gstin: u.gstNumber || u.b2bProfile?.gstin || '27AAAAA0000A1Z5',
          phone: u.phone || '9876543210',
          email: u.email,
          businessAddress: formattedAddr,
          expectedMonthlyOrder: 'Under ₹25,000 / month',
          productsInterested: ['All Categories'],
          status: u.b2bStatus === 'APPROVED' ? 'APPROVED' : u.b2bStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'
        });
      }
    }


    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'ALL') query.status = status.toUpperCase();
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [applications, total] = await Promise.all([
      B2BApplication.find(query)
        .populate('user', 'name email role b2bStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      B2BApplication.countDocuments(query)
    ]);

    const counts = await B2BApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusSummary = {};
    counts.forEach(({ _id, count }) => { statusSummary[_id] = count; });

    return sendSuccess(res, 'Admin: B2B applications retrieved.', {
      applications,
      statusSummary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalApplications: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/b2b/applications/:id
 * Admin: Update application status (APPROVED / REJECTED)
 */
const adminUpdateApplicationStatus = async (req, res, next) => {
  const { status, rejectionReason, reason, adminNotes } = req.body;
  if (status === 'REJECTED') {
    req.body.reason = rejectionReason || reason || adminNotes || 'Rejected by administrator.';
    return adminRejectApplication(req, res, next);
  }
  if (status === 'APPROVED') {
    return adminApproveApplication(req, res, next);
  }
  return sendError(res, 'Status must be APPROVED or REJECTED.', 400, 'VALIDATION_ERROR');
};

/**
 * PATCH /api/admin/b2b/:id/approve & /api/admin/b2b/applications/:id/approve
 * Admin: Approve B2B partner application
 */
const adminApproveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    let application = await B2BApplication.findOne(
      isObjectId ? { _id: id } : { user: id }
    );

    if (!application) {
      // Fallback: check if user exists
      const user = await User.findById(id);
      if (user) {
        user.b2bStatus = 'APPROVED';
        user.role = 'B2B_WHOLESALER';
        if (user.b2bProfile) user.b2bProfile.verificationStatus = 'APPROVED';
        await user.save();
        return sendSuccess(res, `B2B Wholesaler '${user.name}' approved successfully!`, { user });
      }
      return sendError(res, 'B2B Application not found.', 404, 'NOT_FOUND');
    }

    application.status = 'APPROVED';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    if (req.body.adminNotes) application.adminNotes = req.body.adminNotes;
    await application.save();

    // Update target user model
    if (application.user) {
      await User.findByIdAndUpdate(application.user, {
        role: 'B2B_WHOLESALER',
        b2bStatus: 'APPROVED',
        'b2bProfile.verificationStatus': 'APPROVED'
      });
    }

    return sendSuccess(res, `B2B Application for '${application.companyName}' APPROVED. Wholesale pricing unlocked!`, {
      application
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/b2b/:id/reject & /api/admin/b2b/applications/:id/reject
 * Admin: Reject B2B application
 */
const adminRejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, adminNotes, rejectionReason } = req.body;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    let application = await B2BApplication.findOne(
      isObjectId ? { _id: id } : { user: id }
    );

    if (!application) {
      const user = await User.findById(id);
      if (user) {
        user.b2bStatus = 'REJECTED';
        if (user.b2bProfile) user.b2bProfile.verificationStatus = 'REJECTED';
        await user.save();
        return sendSuccess(res, `B2B Application for '${user.name}' rejected.`, { user });
      }
      return sendError(res, 'B2B Application not found.', 404, 'NOT_FOUND');
    }

    application.status = 'REJECTED';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.adminNotes = reason || rejectionReason || adminNotes || 'Verification failed.';
    await application.save();

    if (application.user) {
      await User.findByIdAndUpdate(application.user, {
        b2bStatus: 'REJECTED',
        'b2bProfile.verificationStatus': 'REJECTED'
      });
    }

    return sendSuccess(res, `B2B Application for '${application.companyName}' rejected.`, {
      application
    });
  } catch (error) {
    next(error);
  }
};


/**
 * POST /api/b2b/requests
 * Submit a custom business inquiry / custom quote request
 */
const createB2BRequest = async (req, res, next) => {
  try {
    const {
      requestType, companyName, contactPerson, email, phone, gstin,
      requestedQuantity, requestedPrice, products, message, estimatedVolume
    } = req.body;

    const validatedType = VALID_REQUEST_TYPES.includes(requestType) ? requestType : 'Custom Pricing';
    const msg = (message || req.body.description || '').trim();

    if (!msg) {
      return sendError(res, 'Please provide details of your business requirement.', 400, 'VALIDATION_ERROR');
    }

    const request = await B2BRequest.create({
      user: req.user._id,
      companyName: companyName || req.user.businessName || req.user.name,
      contactPerson: contactPerson || req.user.name,
      email: email || req.user.email,
      phone: phone || req.user.phone || '9876543210',
      gstin: gstin || req.user.gstNumber || '',
      requestType: validatedType,
      requestedQuantity: parseInt(requestedQuantity, 10) || 1,
      requestedPrice: parseFloat(requestedPrice) || 0,
      estimatedVolume: estimatedVolume || '',
      products: Array.isArray(products) ? products : [],
      message: msg,
      status: 'PENDING'
    });

    return sendSuccess(res, 'Custom B2B business request submitted successfully.', { request }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/b2b/requests
 * Get current user's submitted business requests
 */
const getMyB2BRequests = async (req, res, next) => {
  try {
    const requests = await B2BRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    return sendSuccess(res, 'B2B business requests retrieved.', { requests });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/b2b/requests
 * Admin: List all B2B custom requests across all entities
 */
const adminGetB2BRequests = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const { status, type } = req.query;

    const query = {};
    if (status) query.status = status.toUpperCase();
    if (type) query.requestType = type;

    const [requests, total] = await Promise.all([
      B2BRequest.find(query)
        .populate('user', 'name email role b2bStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      B2BRequest.countDocuments(query)
    ]);

    const counts = await B2BRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusSummary = {};
    counts.forEach(({ _id, count }) => { statusSummary[_id] = count; });

    return sendSuccess(res, 'Admin: B2B requests retrieved.', {
      requests,
      statusSummary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/b2b/requests/:id
 * Admin: Update custom B2B request status, offer price, and response
 */
const adminUpdateB2BRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminResponse, counterOfferPrice, adminNotes } = req.body;

    if (status && !VALID_REQUEST_STATUSES.includes(status.toUpperCase())) {
      return sendError(
        res,
        `Invalid status. Allowed values: ${VALID_REQUEST_STATUSES.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const b2bReq = await B2BRequest.findById(id);
    if (!b2bReq) {
      return sendError(res, 'B2B Request not found.', 404, 'NOT_FOUND');
    }

    if (status) b2bReq.status = status.toUpperCase();
    if (adminResponse) b2bReq.adminResponse = adminResponse;
    if (counterOfferPrice !== undefined) b2bReq.counterOfferPrice = parseFloat(counterOfferPrice);
    if (adminNotes) b2bReq.adminNotes = adminNotes;

    b2bReq.reviewedBy = req.user._id;
    b2bReq.reviewedAt = new Date();
    await b2bReq.save();

    return sendSuccess(res, 'B2B Request updated successfully.', { request: b2bReq });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/b2b/dashboard
 * Approved Wholesaler Portal Dashboard Overview
 */
const getB2BDashboard = async (req, res, next) => {
  try {
    const user = req.user;
    const requestsCount = await B2BRequest.countDocuments({ user: user._id });
    return sendSuccess(res, 'B2B wholesale dashboard overview.', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        gstNumber: user.gstNumber,
        b2bStatus: user.b2bStatus
      },
      requestsCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyB2B,
  getB2BStatus,
  getB2BDashboard,
  adminGetApplications,
  adminApproveApplication,
  adminRejectApplication,
  adminUpdateApplicationStatus,
  createB2BRequest,
  getMyB2BRequests,
  adminGetB2BRequests,
  adminUpdateB2BRequest
};

