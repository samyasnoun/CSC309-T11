const AuthService = require('../services/authService');

class PromotionController {
  // Create promotion
  static async createPromotion(req, res, next) {
    try {
      const { name, description, type, startTime, endTime, minSpending, rate, points } = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate required fields
      if (!name || !description || !type || !startTime || !endTime) {
        return res.status(400).json({ error: 'Name, description, type, startTime, and endTime are required' });
      }
      
      // Create promotion
      const promotion = await AuthService.createPromotion({
        name,
        description,
        type,
        startTime,
        endTime,
        minSpending,
        rate,
        points
      }, requestingUser);
      
      res.status(201).json(promotion);
    } catch (error) {
      if (error.message.includes('must be') || 
          error.message.includes('Invalid') ||
          error.message.includes('required') ||
          error.message.includes('past')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
  
  // Get promotions
  static async getPromotions(req, res, next) {
    try {
      const { name, type, started, ended, page = 1, limit = 10 } = req.query;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Get promotions with role-aware filtering
      const result = await AuthService.getPromotions({
        name,
        type,
        started,
        ended,
        page: parseInt(page),
        limit: parseInt(limit)
      }, requestingUser);
      
      res.json({
        count: result.count,
        results: result.results
      });
    } catch (error) {
      if (error.message.includes('must be') || 
          error.message.includes('Invalid') ||
          error.message.includes('both')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }
  
  // Get single promotion
  static async getPromotion(req, res, next) {
    try {
      const { promotionId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate promotion ID
      if (!promotionId || isNaN(parseInt(promotionId))) {
        return res.status(400).json({ error: 'Valid promotion ID is required' });
      }
      
      // Get promotion with role-aware details
      const promotion = await AuthService.getPromotion(parseInt(promotionId), requestingUser);
      
      if (!promotion) {
        return res.status(404).json({ error: 'Promotion not found' });
      }
      
      res.json(promotion);
    } catch (error) {
      if (error.message === 'Promotion not found') {
        return res.status(404).json({ error: 'Promotion not found' });
      }
      next(error);
    }
  }
  
  // Update promotion
  static async updatePromotion(req, res, next) {
    try {
      const { promotionId } = req.params;
      const updateData = req.body;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate promotion ID
      if (!promotionId || isNaN(parseInt(promotionId))) {
        return res.status(400).json({ error: 'Valid promotion ID is required' });
      }
      
      // Update promotion
      const updatedPromotion = await AuthService.updatePromotion(
        parseInt(promotionId), 
        updateData, 
        requestingUser
      );
      
      res.json(updatedPromotion);
    } catch (error) {
      if (error.message.includes('must be') || 
          error.message.includes('Invalid') ||
          error.message.includes('past') ||
          error.message.includes('started')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Promotion not found') {
        return res.status(404).json({ error: 'Promotion not found' });
      }
      if (error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  }
  
  // Delete promotion
  static async deletePromotion(req, res, next) {
    try {
      const { promotionId } = req.params;
      const requestingUser = {
        id: req.auth.userId,
        role: req.auth.role
      };
      
      // Validate promotion ID
      if (!promotionId || isNaN(parseInt(promotionId))) {
        return res.status(400).json({ error: 'Valid promotion ID is required' });
      }
      
      // Delete promotion
      await AuthService.deletePromotion(parseInt(promotionId), requestingUser);
      
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('started')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === 'Promotion not found') {
        return res.status(404).json({ error: 'Promotion not found' });
      }
      next(error);
    }
  }
}

module.exports = PromotionController;
