import express from "express";

import {
    postTransaction,
    getTransactions,
    getTransactionById,
    patchTransactionAsSuspiciousById,
    patchRedemptionTransactionStatusById,
} from "../controllers/transactionController.js";

import { authenticate, requires } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, requires("cashier"), postTransaction);
router.get("/", authenticate, requires("cashier"), getTransactions);
router.get("/:transactionId", authenticate, requires("cashier"), getTransactionById);
router.patch("/:transactionId/suspicious", authenticate, requires("cashier"), patchTransactionAsSuspiciousById);
router.patch("/:transactionId/processed", authenticate, requires("cashier"), patchRedemptionTransactionStatusById);

export default router;