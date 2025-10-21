const express = require('express');
const PromotionController = require('../controllers/promotionController');
const { jwtAuth, requireAny, requireManager } = require('../middleware/auth');

const router = express.Router();

// Promotion CRUD operations
router.post('/', jwtAuth, requireManager, PromotionController.createPromotion);
router.get('/', jwtAuth, requireAny, PromotionController.getPromotions);
router.get('/:promotionId', jwtAuth, requireAny, PromotionController.getPromotion);
router.patch('/:promotionId', jwtAuth, requireManager, PromotionController.updatePromotion);
router.delete('/:promotionId', jwtAuth, requireManager, PromotionController.deletePromotion);

module.exports = router;
