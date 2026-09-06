const express = require('express');
const router = express.Router();
const {
  adminCreateShipment,
  adminGetAllShipments,
  adminGetShipmentById,
  adminCancelShipment,
  adminUpdateShipmentStatus
} = require('../controllers/deliveryController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', adminGetAllShipments);
router.post('/', adminCreateShipment);
router.get('/:id', adminGetShipmentById);
router.post('/:id/cancel', adminCancelShipment);
router.patch('/:id/status', adminUpdateShipmentStatus);

module.exports = router;
