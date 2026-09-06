const express = require('express');
const router = express.Router();
const {
  getInventoryOverview,
  adjustInventory,
  getInventoryTransactions,
  quickRestockProduct
} = require('../controllers/inventoryController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All Admin inventory routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getInventoryOverview);
router.post('/quick-restock', quickRestockProduct);
router.post('/:id/quick-restock', quickRestockProduct);
router.post('/adjust', adjustInventory);
router.post('/:id/adjust', adjustInventory);
router.patch('/:id/adjust', adjustInventory);
router.patch('/:id', adjustInventory);
router.put('/:id', adjustInventory);
router.get('/transactions', getInventoryTransactions);

module.exports = router;
