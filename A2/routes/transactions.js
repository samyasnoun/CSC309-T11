const express = require('express');
const TransactionController = require('../controllers/transactionController');
const { jwtAuth, requireAny, requireCashier, requireManager } = require('../middleware/auth');

const router = express.Router();

// Create transaction (any authenticated user)
router.post('/', jwtAuth, requireAny, TransactionController.createTransaction);

// Get transaction by ID (any authenticated user, with permission checks)
router.get('/:transactionId', jwtAuth, requireAny, TransactionController.getTransaction);

// Get user's transactions (any authenticated user, with permission checks)
router.get('/users/:userId', jwtAuth, requireAny, TransactionController.getUserTransactions);

// Flag transaction as suspicious (Manager only)
router.post('/:transactionId/suspicious', jwtAuth, requireManager, TransactionController.flagAsSuspicious);

// Process transaction (Cashier only)
router.post('/:transactionId/processed', jwtAuth, requireCashier, TransactionController.processTransaction);

module.exports = router;

