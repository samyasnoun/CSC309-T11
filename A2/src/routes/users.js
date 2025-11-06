import express from "express";

import {
  postUser,
  getUsers,
  getUserById,
  patchUserById,
  getCurrentUser,
  patchCurrentUser,
  patchCurrentUserPassword,
  getUserTransactions,
  postTransferTransaction,
  getCurrentUserTransactions,
  postRedemptionTransaction,
} from "../controllers/userController.js";

import { authenticate, requires } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /users - Register a new user (Cashier or higher required)
router.post("/", authenticate, requires("cashier"), postUser);

// GET /users - Retrieve a list of users (manager or higher)
router.get("/", authenticate, requires("manager"), getUsers);

// GET /users/me - Get current authenticated user
router.get("/me", authenticate, getCurrentUser);

// PATCH /users/me - Update current user's info
router.patch("/me", authenticate, patchCurrentUser);

// PATCH /users/me/password - Update current user's password
router.patch("/me/password", authenticate, patchCurrentUserPassword);

// POST /users/me/transactions - Create a new redemption transaction for the current user
router.post("/me/transactions", authenticate, postRedemptionTransaction);

// GET /users/me/transactions - Get current user's transactions
router.get("/me/transactions", authenticate, getCurrentUserTransactions);

// GET /users/:userId - Retrieve a single user by ID
router.get("/:userId", authenticate, getUserById);

// PATCH /users/:userId - Update a specific user's data (manager/superuser)
router.patch("/:userId", authenticate, requires("manager"), patchUserById);

// GET /users/:userId/transactions - Get user's transactions
router.get("/:userId/transactions", authenticate, requires("cashier"), getUserTransactions);

// POST /users/:userId/transactions - Create a new transfer transaction between the current logged-in user (sender) and the user specified by userId (the recipient)
router.post("/:userId/transactions", authenticate, postTransferTransaction);

export default router;
