const express = require('express');
const router = express.Router();
const {
  adminGetApplications,
  adminApproveApplication,
  adminRejectApplication,
  adminUpdateApplicationStatus,
  adminGetB2BRequests,
  adminUpdateB2BRequest
} = require('../controllers/b2bController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All Admin B2B routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

// B2B Applications Management
router.get('/applications', adminGetApplications);
router.patch('/applications/:id', adminUpdateApplicationStatus);
router.patch('/applications/:id/approve', adminApproveApplication);
router.patch('/applications/:id/reject', adminRejectApplication);
router.patch('/:id', adminUpdateApplicationStatus);
router.patch('/:id/approve', adminApproveApplication);
router.patch('/:id/reject', adminRejectApplication);

// B2B Custom Business Requests Management
router.get('/requests', adminGetB2BRequests);
router.patch('/requests/:id', adminUpdateB2BRequest);

module.exports = router;

