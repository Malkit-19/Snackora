const express = require('express');
const router = express.Router();
const {
  getDeliveryRates,
  getOrderTracking
} = require('../controllers/deliveryController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/rates', getDeliveryRates);
router.get('/tracking/:id', optionalAuth, getOrderTracking);

module.exports = router;
