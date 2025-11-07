const express = require("express");

const {
    postPromotion,
    getPromotions,
    getPromotionById,
    patchPromotionById,
    deletePromotionById,
} = require("../controllers/promotionController.js");
const { authenticate, requires, attachUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, requires("manager"), postPromotion);
router.get("/", authenticate, requires("regular"), getPromotions);
router.get("/:promotionId", authenticate, requires("regular"), getPromotionById);
router.patch("/:promotionId", authenticate, requires("manager"), patchPromotionById);
router.delete("/:promotionId", authenticate, requires("manager"), deletePromotionById);

module.exports = router;
