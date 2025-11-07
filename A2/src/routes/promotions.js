const express = require("express");

const {
    postPromotion,
    getPromotions,
    getPromotionById,
    patchPromotionById,
    deletePromotionById,
} = require("../controllers/promotionController.js");
const { authenticate, requires } = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/", authenticate, requires("manager"), postPromotion);
router.get("/", optionalAuth, getPromotions);
router.get("/:promotionId", optionalAuth, getPromotionById);
router.patch("/:promotionId", authenticate, requires("manager"), patchPromotionById);
router.delete("/:promotionId", authenticate, requires("manager"), deletePromotionById);

module.exports = router;
