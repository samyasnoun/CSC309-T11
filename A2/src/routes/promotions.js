import express from "express";

import {
    postPromotion,
    getPromotions,
    getPromotionById,
    patchPromotionById,
    deletePromotionById,
} from "../controllers/promotionController.js";

import { authenticate, requires } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, requires("manager"), postPromotion);
router.get("/", authenticate, requires("manager"), getPromotions);
router.get("/:promotionId", authenticate, requires("manager"), getPromotionById);
router.patch("/:promotionId", authenticate, requires("manager"), patchPromotionById);
router.delete("/:promotionId", authenticate, requires("manager"), deletePromotionById);

export default router;
