const AuthService = require('../services/authService');

class TransactionController {
  // Create transaction
  static async createTransaction(req, res, next) {
    try {
      const { type, amountCents, targetUserId, previousTransactionId, description } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role,
        suspicious: req.auth.suspicious || false
      };
      
      // Validate required fields
      if (!type || !targetUserId) {
        return res.status(400).json({ error: 'Transaction type and target user ID are required' });
      }
      
      // Create transaction
      const result = await AuthService.createTransaction({
        type,
        amountCents,
        targetUserId,
        previousTransactionId,
        description
      }, requestingUser);
      
      // Handle transfer case (returns two transactions)
      if (type === 'transfer' && result.senderTransaction && result.receiverTransaction) {
        return res.status(201).json({
          message: 'Transfer completed successfully',
          senderTransaction: result.senderTransaction,
          receiverTransaction: result.receiverTransaction
        });
      }
      
      res.status(201).json({
        message: 'Transaction created successfully',
        transaction: result
      });
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('Insufficient permissions') ||
          error.message.includes('not found') ||
          error.message.includes('Insufficient points')) {
        return res.status(400).json({ error: error.message });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Get transaction by ID
  static async getTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate transaction ID
      if (!transactionId || isNaN(parseInt(transactionId))) {
        return res.status(400).json({ error: 'Valid transaction ID is required' });
      }
      
      // Get transaction
      const transaction = await AuthService.getTransaction(parseInt(transactionId), requestingUser);
      
      res.json(transaction);
    } catch (error) {
      // Handle not found
      if (error.message === 'Transaction not found') {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Get user's transactions
  static async getUserTransactions(req, res, next) {
    try {
      const { userId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate user ID
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Get user's transactions
      const transactions = await AuthService.getUserTransactions(parseInt(userId), requestingUser);
      
      res.json({
        count: transactions.length,
        transactions
      });
    } catch (error) {
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Flag transaction as suspicious (Manager only)
  static async flagAsSuspicious(req, res, next) {
    try {
      const { transactionId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate transaction ID
      if (!transactionId || isNaN(parseInt(transactionId))) {
        return res.status(400).json({ error: 'Valid transaction ID is required' });
      }
      
      // Flag transaction as suspicious
      const updatedTransaction = await AuthService.flagTransactionAsSuspicious(
        parseInt(transactionId), 
        requestingUser
      );
      
      res.json({
        message: 'Transaction flagged as suspicious',
        transaction: updatedTransaction
      });
    } catch (error) {
      // Handle not found
      if (error.message === 'Transaction not found') {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Process transaction (Cashier only)
  static async processTransaction(req, res, next) {
    try {
      const { transactionId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate transaction ID
      if (!transactionId || isNaN(parseInt(transactionId))) {
        return res.status(400).json({ error: 'Valid transaction ID is required' });
      }
      
      // Process transaction
      const updatedTransaction = await AuthService.processTransaction(
        parseInt(transactionId), 
        requestingUser
      );
      
      res.json({
        message: 'Transaction processed successfully',
        transaction: updatedTransaction
      });
    } catch (error) {
      // Handle not found
      if (error.message === 'Transaction not found') {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('already processed')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
}

module.exports = TransactionController;

