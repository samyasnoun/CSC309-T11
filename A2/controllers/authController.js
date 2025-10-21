const AuthService = require('../services/authService');

class AuthController {
  // Login endpoint
  static async login(req, res, next) {
    try {
      const { utorid, password } = req.body;
      
      if (!utorid || !password) {
        return res.status(400).json({ error: 'Utorid and password are required' });
      }
      
      const user = await AuthService.authenticate(utorid, password);
      const token = AuthService.generateToken(user);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      res.json({
        token,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          utorid: user.utorid,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Get current user profile
  static async getProfile(req, res, next) {
    try {
      const user = await AuthService.getUserById(req.auth.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
  
  // Logout endpoint (client-side token removal)
  static async logout(req, res, next) {
    try {
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
  
  // Verify token endpoint
  static async verifyToken(req, res, next) {
    try {
      res.json({ 
        valid: true, 
        user: {
          id: req.auth.userId,
          utorid: req.auth.utorid,
          role: req.auth.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  
  // Request password reset
  static async requestReset(req, res, next) {
    try {
      const { utorid } = req.body;
      
      if (!utorid) {
        return res.status(400).json({ error: 'Utorid is required' });
      }
      
      const resetData = await AuthService.issueResetToken(utorid);
      
      res.status(202).json({
        message: 'Reset token generated',
        resetToken: resetData.resetToken,
        expiresAt: resetData.expiresAt
      });
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      next(error);
    }
  }
  
  // Activate account or reset password with token
  static async handleToken(req, res, next) {
    try {
      const { resetToken } = req.params;
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      
      // Try to validate the token
      let user;
      try {
        user = await AuthService.validateResetToken(resetToken);
      } catch (error) {
        if (error.message === 'Invalid reset token') {
          return res.status(404).json({ error: 'Invalid reset token' });
        }
        if (error.message === 'Reset token has expired') {
          return res.status(400).json({ error: 'Reset token has expired' });
        }
        throw error;
      }
      
      // Check if this is an activation or password reset
      if (!user.activated) {
        // This is an activation token
        const updatedUser = await AuthService.activateAccount(resetToken, password);
        res.json({
          message: 'Account activated successfully',
          user: {
            id: updatedUser.id,
            utorid: updatedUser.utorid,
            email: updatedUser.email,
            role: updatedUser.role,
            activated: updatedUser.activated
          }
        });
      } else {
        // This is a password reset token
        const updatedUser = await AuthService.resetPassword(resetToken, password);
        res.json({
          message: 'Password reset successfully',
          user: {
            id: updatedUser.id,
            utorid: updatedUser.utorid,
            email: updatedUser.email,
            role: updatedUser.role
          }
        });
      }
    } catch (error) {
      next(error);
    }
  }
  
  // Register new user (for cashiers/managers/superusers)
  static async registerUser(req, res, next) {
    try {
      const { utorid, name, email } = req.body;
      
      // Validate input data
      AuthService.validateRegistrationData({ utorid, name, email });
      
      // Register user
      const result = await AuthService.registerUser({ utorid, name, email });
      
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          utorid: result.user.utorid,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          verified: result.user.verified,
          activated: result.user.activated,
          points: result.user.points
        },
        activationToken: result.activationToken,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      if (error.message === 'User with this utorid or email already exists') {
        return res.status(409).json({ error: 'User with this utorid or email already exists' });
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('must be') || 
          error.message.includes('must contain') ||
          error.message.includes('UofT domain')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Get users with filtering and pagination (cashiers+ only)
  static async getUsers(req, res, next) {
    try {
      const {
        name = '',
        role = '',
        verified = '',
        activated = '',
        page = 1,
        limit = 10
      } = req.query;
      
      // Validate filter parameters
      AuthService.validateFilterParams({
        page,
        limit,
        role,
        verified,
        activated
      });
      
      // Get requesting user's role for field projection
      const requestingUserRole = req.auth.role || 'regular';
      
      // Get filtered users with role-aware field projection
      const result = await AuthService.getUsers({
        name,
        role,
        verified,
        activated,
        page: parseInt(page),
        limit: parseInt(limit)
      }, requestingUserRole);
      
      res.json({
        count: result.count,
        results: result.results
      });
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('must be') || 
          error.message.includes('Invalid') ||
          error.message.includes('between')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Update user (managers+ only)
  static async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const requestingUserRole = req.auth.role || 'regular';
      
      // Validate user ID
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Valid user ID is required' });
      }
      
      // Check if user exists
      const existingUser = await AuthService.getUserForUpdate(parseInt(userId));
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update user with role-based validation
      const updatedUser = await AuthService.updateUser(
        parseInt(userId), 
        updateData, 
        requestingUserRole
      );
      
      res.json(updatedUser);
    } catch (error) {
      // Handle permission errors
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      
      // Handle validation errors
      if (error.message.includes('must be') || 
          error.message.includes('Invalid') ||
          error.message.includes('required') ||
          error.message.includes('UofT domain') ||
          error.message.includes('can only set') ||
          error.message.includes('No valid fields')) {
        return res.status(400).json({ error: error.message });
      }
      
      // Handle not found
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      
      next(error);
    }
  }
  
  // Get current user's profile
  static async getSelfProfile(req, res, next) {
    try {
      const userId = req.auth.userId;
      
      const profile = await AuthService.getSelfProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
  
  // Update current user's profile
  static async updateSelfProfile(req, res, next) {
    try {
      const userId = req.auth.userId;
      const utorid = req.auth.utorid;
      
      // Prepare update data
      const updateData = {
        name: req.body.name,
        email: req.body.email,
        birthday: req.body.birthday ? new Date(req.body.birthday) : req.body.birthday
      };
      
      // Handle avatar upload if present
      if (req.file) {
        const avatarUrl = await AuthService.saveAvatarFile(req.file, utorid);
        updateData.avatarUrl = avatarUrl;
      }
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      // Check if any data to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      // Update profile
      const updatedProfile = await AuthService.updateSelfProfile(userId, updateData);
      
      res.json(updatedProfile);
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('must be') || 
          error.message.includes('required') ||
          error.message.includes('UofT domain') ||
          error.message.includes('valid date') ||
          error.message.includes('future') ||
          error.message.includes('string')) {
        return res.status(400).json({ error: error.message });
      }
      
      next(error);
    }
  }
  
  // Change current user's password
  static async changePassword(req, res, next) {
    try {
      const userId = req.auth.userId;
      const { currentPassword, newPassword } = req.body;
      
      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      // Change password with verification
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json(result);
    } catch (error) {
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('must be') ||
          error.message.includes('too weak') ||
          error.message.includes('incorrect') ||
          error.message.includes('not activated') ||
          error.message.includes('No password set')) {
        return res.status(400).json({ error: error.message });
      }
      
      // Handle not found
      if (error.message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      
      next(error);
    }
  }
}

module.exports = AuthController;
