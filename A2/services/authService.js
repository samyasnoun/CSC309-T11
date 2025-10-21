const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { validateUtorid, validatePagination } = require('../lib/validation');

const prisma = new PrismaClient();

class AuthService {
  // Generate JWT token
  static generateToken(user) {
    const payload = {
      userId: user.id,
      utorid: user.utorid,
      role: user.role,
      email: user.email
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256'
    });
  }
  
  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }
  
  // Authenticate user
  static async authenticate(utorid, password) {
    const user = await prisma.user.findUnique({
      where: { utorid },
      select: {
        id: true,
        utorid: true,
        email: true,
        role: true,
        passwordHash: true,
        verified: true,
        activated: true
      }
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (!user.activated) {
      throw new Error('Account is deactivated');
    }
    
    if (!user.verified) {
      throw new Error('Account is not verified');
    }
    
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    return user;
  }
  
  // Get user by ID
  static async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        activated: true,
        points: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    if (user) {
      // Add dummy password field for API compatibility
      user.password = '';
    }
    
    return user;
  }
  
  // Check if user has required role
  static hasRole(userRole, requiredRole) {
    const roleHierarchy = {
      'regular': 1,
      'cashier': 2,
      'organizer': 3,
      'manager': 4,
      'superuser': 5
    };
    
    const userLevel = roleHierarchy[userRole] || 1;
    const requiredLevel = roleHierarchy[requiredRole] || 1;
    
    return userLevel >= requiredLevel;
  }
  
  // Generate activation token
  static generateActivationToken() {
    return {
      token: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
  }
  
  // Generate reset token
  static generateResetToken() {
    return {
      token: uuidv4(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    };
  }
  
  // Create user with activation token
  static async createUserWithActivation(userData) {
    const activationData = this.generateActivationToken();
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        activationToken: activationData.token,
        activationExpires: activationData.expiresAt,
        activated: false
      }
    });
    
    return {
      user,
      activationToken: activationData.token,
      expiresAt: activationData.expiresAt
    };
  }
  
  // Issue reset token
  static async issueResetToken(utorid) {
    const user = await prisma.user.findUnique({
      where: { utorid }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const resetData = this.generateResetToken();
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetData.token,
        resetExpires: resetData.expiresAt
      }
    });
    
    return {
      resetToken: resetData.token,
      expiresAt: resetData.expiresAt
    };
  }
  
  // Validate and use reset token
  static async validateResetToken(resetToken) {
    const user = await prisma.user.findUnique({
      where: { resetToken }
    });
    
    if (!user) {
      throw new Error('Invalid reset token');
    }
    
    if (!user.resetExpires || user.resetExpires < new Date()) {
      throw new Error('Reset token has expired');
    }
    
    return user;
  }
  
  // Activate account with token
  static async activateAccount(activationToken, password) {
    const user = await prisma.user.findUnique({
      where: { activationToken }
    });
    
    if (!user) {
      throw new Error('Invalid activation token');
    }
    
    if (!user.activationExpires || user.activationExpires < new Date()) {
      throw new Error('Activation token has expired');
    }
    
    const passwordHash = await this.hashPassword(password);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        activated: true,
        verified: true,
        passwordHash,
        activationToken: null,
        activationExpires: null
      }
    });
    
    return updatedUser;
  }
  
  // Reset password with token
  static async resetPassword(resetToken, newPassword) {
    const user = await this.validateResetToken(resetToken);
    
    const passwordHash = await this.hashPassword(newPassword);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null
      }
    });
    
    return updatedUser;
  }
  
  // Register new user (for cashiers/managers/superusers)
  static async registerUser(userData) {
    const { utorid, name, email } = userData;
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { utorid: utorid },
          { email: email }
        ]
      }
    });
    
    if (existingUser) {
      throw new Error('User with this utorid or email already exists');
    }
    
    // Generate activation token (7 days expiry)
    const activationData = this.generateActivationToken();
    
    // Create user with activation token
    const user = await prisma.user.create({
      data: {
        utorid,
        name,
        email,
        role: 'regular',
        verified: false,
        activated: false,
        points: 0,
        suspicious: false,
        activationToken: activationData.token,
        activationExpires: activationData.expiresAt
      }
    });
    
    return {
      user,
      activationToken: activationData.token,
      expiresAt: activationData.expiresAt
    };
  }
  
  // Validate user registration data
  static validateRegistrationData(data) {
    const { utorid, name, email } = data;
    
    // Validate utorid (7-8 alphanumeric)
    validateUtorid(utorid, { required: true, fieldName: 'utorid' });
    
    // Validate name (1-50 characters)
    if (!name || typeof name !== 'string') {
      throw new Error('Name is required');
    }
    
    if (name.length < 1 || name.length > 50) {
      throw new Error('Name must be 1-50 characters long');
    }
    
    // Validate email (UofT domain)
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }
    
    const uoftDomains = [
      'mail.utoronto.ca',
      'utoronto.ca',
      'student.utoronto.ca'
    ];
    
    const emailDomain = email.split('@')[1];
    if (!emailDomain || !uoftDomains.includes(emailDomain)) {
      throw new Error('Email must be from a UofT domain');
    }
    
    return true;
  }
  
  // Get users with filtering and pagination
  static async getUsers(filters = {}, requestingUserRole = 'regular') {
    const {
      name = '',
      role = '',
      verified = '',
      activated = ''
    } = filters;
    
    // Validate and set pagination defaults
    const { page, limit } = validatePagination(filters, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100
    });
    
    // Build where clause
    const where = {};
    
    // Name filter (matches utorid or name, case-insensitive)
    if (name) {
      where.OR = [
        { utorid: { contains: name, mode: 'insensitive' } },
        { name: { contains: name, mode: 'insensitive' } }
      ];
    }
    
    // Role filter
    if (role) {
      where.role = role;
    }
    
    // Verified filter
    if (verified !== '') {
      where.verified = verified === 'true';
    }
    
    // Activated filter
    if (activated !== '') {
      where.activated = activated === 'true';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Get total count
    const count = await prisma.user.count({ where });
    
    // Determine field selection based on requesting user's role
    const selectFields = this.getFieldSelection(requestingUserRole);
    
    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: selectFields,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take
    });
    
    // Add promotions for each user if needed
    const usersWithPromotions = await this.addPromotionsToUsers(users, requestingUserRole);
    
    return {
      count,
      results: usersWithPromotions
    };
  }
  
  // Get field selection based on user role
  static getFieldSelection(userRole) {
    const roleHierarchy = {
      'regular': 1,
      'cashier': 2,
      'organizer': 3,
      'manager': 4,
      'superuser': 5
    };
    
    const userLevel = roleHierarchy[userRole] || 1;
    
    // Cashier+ fields (level 2+)
    const cashierFields = {
      id: true,
      utorid: true,
      name: true,
      points: true,
      verified: true
    };
    
    // Manager+ fields (level 4+)
    const managerFields = {
      ...cashierFields,
      email: true,
      birthday: true,
      role: true,
      createdAt: true,
      lastLogin: true,
      avatarUrl: true,
      activated: true,
      suspicious: true
    };
    
    return userLevel >= 4 ? managerFields : cashierFields;
  }
  
  // Add promotions to users based on role
  static async addPromotionsToUsers(users, requestingUserRole) {
    const roleHierarchy = {
      'regular': 1,
      'cashier': 2,
      'organizer': 3,
      'manager': 4,
      'superuser': 5
    };
    
    const userLevel = roleHierarchy[requestingUserRole] || 1;
    
    // Only add promotions for cashier+ roles
    if (userLevel >= 2) {
      // Get available one-time promotions
      const availablePromotions = await this.getAvailablePromotions();
      
      return users.map(user => ({
        ...user,
        promotions: availablePromotions
      }));
    }
    
    return users;
  }
  
  // Get available one-time promotions
  static async getAvailablePromotions() {
    const now = new Date();
    
    const promotions = await prisma.promotion.findMany({
      where: {
        startAt: { lte: now },
        endAt: { gte: now },
        oneTimePoints: { not: null }
      },
      select: {
        id: true,
        name: true,
        oneTimePoints: true,
        startAt: true,
        endAt: true
      },
      orderBy: {
        startAt: 'asc'
      }
    });
    
    return promotions;
  }
  
  // Update user with role-based permissions
  static async updateUser(userId, updateData, requestingUserRole) {
    // Get the user to update
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Validate permissions and data based on requesting user's role
    const validatedData = this.validateUserUpdate(updateData, requestingUserRole);
    
    // Apply role-specific business logic
    if (validatedData.role === 'cashier' && user.role !== 'cashier') {
      // When promoting to cashier, must set suspicious=false
      // A suspicious user cannot be a cashier
      if (user.suspicious) {
        throw new Error('Cannot promote suspicious user to cashier. Clear suspicious flag first.');
      }
      validatedData.suspicious = false; // Auto-set suspicious=false when promoting to cashier
    }
    
    // Manager can clear suspicious flag for cashiers
    if (validatedData.suspicious === false && user.role === 'cashier' && user.suspicious === true) {
      // This is allowed - manager clearing suspicious flag for cashier
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        suspicious: true
      }
    });
    
    return updatedUser;
  }
  
  // Validate user update data based on role
  static validateUserUpdate(updateData, requestingUserRole) {
    const roleHierarchy = {
      'regular': 1,
      'cashier': 2,
      'organizer': 3,
      'manager': 4,
      'superuser': 5
    };
    
    const userLevel = roleHierarchy[requestingUserRole] || 1;
    const validatedData = {};
    
    // Manager+ can update email
    if (updateData.email !== undefined) {
      if (userLevel < 4) {
        throw new Error('Insufficient permissions to update email');
      }
      
      // Validate email format and UofT domain
      if (!updateData.email || typeof updateData.email !== 'string') {
        throw new Error('Email is required');
      }
      
      const uoftDomains = [
        'mail.utoronto.ca',
        'utoronto.ca',
        'student.utoronto.ca'
      ];
      
      const emailDomain = updateData.email.split('@')[1];
      if (!emailDomain || !uoftDomains.includes(emailDomain)) {
        throw new Error('Email must be from a UofT domain');
      }
      
      validatedData.email = updateData.email;
    }
    
    // Manager+ can update verified status
    if (updateData.verified !== undefined) {
      if (userLevel < 4) {
        throw new Error('Insufficient permissions to update verification status');
      }
      
      if (updateData.verified !== true) {
        throw new Error('Verified must be set to true');
      }
      
      validatedData.verified = updateData.verified;
    }
    
    // Manager+ can update suspicious status
    if (updateData.suspicious !== undefined) {
      if (userLevel < 4) {
        throw new Error('Insufficient permissions to update suspicious status');
      }
      
      if (typeof updateData.suspicious !== 'boolean') {
        throw new Error('Suspicious must be a boolean value');
      }
      
      validatedData.suspicious = updateData.suspicious;
    }
    
    // Role updates with different permissions
    if (updateData.role !== undefined) {
      if (userLevel < 4) {
        throw new Error('Insufficient permissions to update role');
      }
      
      // Manager can only set to cashier or regular
      if (userLevel === 4) {
        if (!['cashier', 'regular'].includes(updateData.role)) {
          throw new Error('Managers can only set role to cashier or regular');
        }
      }
      
      // Superuser can set any role
      if (userLevel === 5) {
        if (!['regular', 'cashier', 'manager', 'superuser'].includes(updateData.role)) {
          throw new Error('Invalid role value');
        }
      }
      
      validatedData.role = updateData.role;
    }
    
    // Check if any data was provided
    if (Object.keys(validatedData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    return validatedData;
  }
  
  // Get user by ID for updates
  static async getUserForUpdate(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        suspicious: true
      }
    });
  }
  
  // Get current user's full profile
  static async getSelfProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        verified: true,
        activated: true,
        points: true,
        suspicious: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true
      }
    });
    
    if (user) {
      // Add dummy password field for API compatibility
      user.password = '';
    }
    
    return user;
  }
  
  // Update current user's profile
  static async updateSelfProfile(userId, updateData) {
    // Validate update data
    this.validateSelfProfileUpdate(updateData);
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        utorid: true,
        name: true,
        email: true,
        birthday: true,
        role: true,
        verified: true,
        activated: true,
        points: true,
        suspicious: true,
        createdAt: true,
        lastLogin: true,
        avatarUrl: true
      }
    });
    
    return updatedUser;
  }
  
  // Validate self profile update data
  static validateSelfProfileUpdate(updateData) {
    const { name, email, birthday, avatarUrl } = updateData;
    
    // Validate name (1-50 characters)
    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        throw new Error('Name is required');
      }
      
      if (name.length < 1 || name.length > 50) {
        throw new Error('Name must be 1-50 characters long');
      }
    }
    
    // Validate email (UofT domain)
    if (email !== undefined) {
      if (!email || typeof email !== 'string') {
        throw new Error('Email is required');
      }
      
      const uoftDomains = [
        'mail.utoronto.ca',
        'utoronto.ca',
        'student.utoronto.ca'
      ];
      
      const emailDomain = email.split('@')[1];
      if (!emailDomain || !uoftDomains.includes(emailDomain)) {
        throw new Error('Email must be from a UofT domain');
      }
    }
    
    // Validate birthday (optional date)
    if (birthday !== undefined) {
      if (birthday !== null) {
        const birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
          throw new Error('Birthday must be a valid date');
        }
        
        // Check if birthday is not in the future
        if (birthdayDate > new Date()) {
          throw new Error('Birthday cannot be in the future');
        }
      }
    }
    
    // Validate avatarUrl (optional string)
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        throw new Error('Avatar URL must be a string or null');
      }
    }
    
    return true;
  }
  
  // Save avatar file and return relative URL
  static async saveAvatarFile(file, utorid) {
    const path = require('path');
    const fs = require('fs').promises;
    
    // Ensure uploads/avatars directory exists
    const uploadsDir = path.join(__dirname, '../uploads/avatars');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Generate filename: <utorid>.<ext>
    const ext = path.extname(file.originalname);
    const filename = `${utorid}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    
    // Save file
    await fs.writeFile(filepath, file.buffer);
    
    // Return relative URL
    return `/uploads/avatars/${filename}`;
  }
  
  // Change user password with current password verification
  static async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        activated: true
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.activated) {
      throw new Error('Account is not activated');
    }
    
    // Verify current password
    if (!user.passwordHash) {
      throw new Error('No password set for this account');
    }
    
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Validate new password
    this.validateNewPassword(newPassword);
    
    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });
    
    return { message: 'Password changed successfully' };
  }
  
  // Validate new password
  static validateNewPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('New password is required');
    }
    
    if (password.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }
    
    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345'];
    if (weakPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too weak. Please choose a stronger password');
    }
    
    return true;
  }
  
  // Create transaction with validation rules
  static async createTransaction(transactionData, requestingUser) {
    const { type, amountCents, targetUserId, previousTransactionId, description } = transactionData;
    const requestingUserId = requestingUser.id;
    const requestingUserRole = requestingUser.role;
    
    // Validate transaction type
    const validTypes = ['purchase', 'adjustment', 'redemption', 'transfer', 'event'];
    if (!validTypes.includes(type)) {
      throw new Error('Invalid transaction type');
    }
    
    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });
    
    if (!targetUser) {
      throw new Error('Target user not found');
    }
    
    let pointsDelta = 0;
    let requiresVerification = false;
    let processed = false;
    let cashierId = null;
    
    switch (type) {
      case 'purchase':
        // Cashier+ only
        if (!this.hasRole(requestingUserRole, 'cashier')) {
          throw new Error('Insufficient permissions to create purchase transaction');
        }
        
        if (!amountCents || amountCents <= 0) {
          throw new Error('Amount in cents is required for purchase');
        }
        
        // Compute points: floor(amountCents / 25)
        pointsDelta = Math.floor(amountCents / 25);
        
        // If cashier is suspicious, require verification
        if (requestingUser.suspicious) {
          requiresVerification = true;
        } else {
          processed = true;
        }
        
        cashierId = requestingUserId;
        break;
        
      case 'adjustment':
        // Manager+ only
        if (!this.hasRole(requestingUserRole, 'manager')) {
          throw new Error('Insufficient permissions to create adjustment transaction');
        }
        
        if (!previousTransactionId) {
          throw new Error('Previous transaction ID is required for adjustment');
        }
        
        // Validate previous transaction exists
        const previousTransaction = await prisma.transaction.findUnique({
          where: { id: previousTransactionId }
        });
        
        if (!previousTransaction) {
          throw new Error('Previous transaction not found');
        }
        
        if (!amountCents) {
          throw new Error('Adjustment amount is required');
        }
        
        pointsDelta = amountCents; // Can be positive or negative
        processed = true;
        break;
        
      case 'redemption':
        // Customer creates redemption
        if (!amountCents || amountCents <= 0) {
          throw new Error('Redemption amount is required');
        }
        
        // Check if user has enough points
        const userPoints = await this.getUserPoints(targetUserId);
        if (userPoints < amountCents) {
          throw new Error('Insufficient points for redemption');
        }
        
        pointsDelta = -amountCents; // Negative for redemption
        // Not processed until cashier processes it
        break;
        
      case 'transfer':
        // User transfers points to another user
        if (!amountCents || amountCents <= 0) {
          throw new Error('Transfer amount is required');
        }
        
        // Check if user has enough points
        const transferrerPoints = await this.getUserPoints(requestingUserId);
        if (transferrerPoints < amountCents) {
          throw new Error('Insufficient points for transfer');
        }
        
        // Create two transactions: negative for sender, positive for receiver
        const senderTransaction = await prisma.transaction.create({
          data: {
            type: 'transfer',
            amountCents: amountCents,
            pointsDelta: -amountCents,
            createdById: requestingUserId,
            targetUserId: requestingUserId,
            processed: true
          }
        });
        
        const receiverTransaction = await prisma.transaction.create({
          data: {
            type: 'transfer',
            amountCents: amountCents,
            pointsDelta: amountCents,
            createdById: requestingUserId,
            targetUserId: targetUserId,
            processed: true
          }
        });
        
        return { senderTransaction, receiverTransaction };
        
      case 'event':
        // Organizer creates event transaction
        if (!this.hasRole(requestingUserRole, 'organizer')) {
          throw new Error('Insufficient permissions to create event transaction');
        }
        
        if (!amountCents || amountCents <= 0) {
          throw new Error('Event points amount is required');
        }
        
        pointsDelta = amountCents;
        processed = true;
        break;
    }
    
    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        type,
        amountCents,
        pointsDelta,
        createdById: requestingUserId,
        targetUserId,
        cashierId,
        requiresVerification,
        processed,
        processedAt: processed ? new Date() : null
      }
    });
    
    return transaction;
  }
  
  // Get user's current points
  static async getUserPoints(userId) {
    const result = await prisma.transaction.aggregate({
      where: {
        targetUserId: userId,
        processed: true
      },
      _sum: {
        pointsDelta: true
      }
    });
    
    return result._sum.pointsDelta || 0;
  }
  
  // Get transaction by ID
  static async getTransaction(transactionId, requestingUser) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        createdBy: {
          select: { id: true, utorid: true, name: true }
        },
        targetUser: {
          select: { id: true, utorid: true, name: true }
        },
        cashier: {
          select: { id: true, utorid: true, name: true }
        }
      }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check permissions
    const requestingUserId = requestingUser.id;
    const requestingUserRole = requestingUser.role;
    
    // Manager+ can view all transactions
    if (this.hasRole(requestingUserRole, 'manager')) {
      return transaction;
    }
    
    // Users can only view their own transactions
    if (transaction.targetUserId === requestingUserId || transaction.createdById === requestingUserId) {
      return transaction;
    }
    
    throw new Error('Insufficient permissions to view this transaction');
  }
  
  // Get user's transactions
  static async getUserTransactions(userId, requestingUser) {
    const requestingUserId = requestingUser.id;
    const requestingUserRole = requestingUser.role;
    
    // Manager+ can view all transactions
    if (this.hasRole(requestingUserRole, 'manager')) {
      return await prisma.transaction.findMany({
        where: { targetUserId: userId },
        include: {
          createdBy: {
            select: { id: true, utorid: true, name: true }
          },
          targetUser: {
            select: { id: true, utorid: true, name: true }
          },
          cashier: {
            select: { id: true, utorid: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
    
    // Users can only view their own transactions
    if (userId !== requestingUserId) {
      throw new Error('Insufficient permissions to view this user\'s transactions');
    }
    
    return await prisma.transaction.findMany({
      where: { targetUserId: userId },
      include: {
        createdBy: {
          select: { id: true, utorid: true, name: true }
        },
        targetUser: {
          select: { id: true, utorid: true, name: true }
        },
        cashier: {
          select: { id: true, utorid: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  // Flag transaction as suspicious (Manager only)
  static async flagTransactionAsSuspicious(transactionId, requestingUser) {
    if (!this.hasRole(requestingUser.role, 'manager')) {
      throw new Error('Insufficient permissions to flag transaction as suspicious');
    }
    
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Update transaction to require verification
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        requiresVerification: true,
        processed: false
      }
    });
    
    return updatedTransaction;
  }
  
  // Process transaction (Cashier only)
  static async processTransaction(transactionId, requestingUser) {
    if (!this.hasRole(requestingUser.role, 'cashier')) {
      throw new Error('Insufficient permissions to process transaction');
    }
    
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.processed) {
      throw new Error('Transaction already processed');
    }
    
    // Process the transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        processed: true,
        processedAt: new Date(),
        cashierId: requestingUser.id
      }
    });
    
    return updatedTransaction;
  }
  
  // Create event
  static async createEvent(eventData, requestingUser) {
    const { name, description, location, startAt, endAt, capacity, pointsBudget } = eventData;
    const requestingUserId = requestingUser.id;
    const requestingUserRole = requestingUser.role;
    
    // Validate required fields
    if (!name || !startAt || !endAt || !capacity || !pointsBudget) {
      throw new Error('Name, start date, end date, capacity, and points budget are required');
    }
    
    // Validate dates
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
    
    if (startDate < new Date()) {
      throw new Error('Start date cannot be in the past');
    }
    
    // Validate capacity and points budget
    if (capacity <= 0 || pointsBudget <= 0) {
      throw new Error('Capacity and points budget must be positive');
    }
    
    // Create event
    const event = await prisma.event.create({
      data: {
        name,
        description: description || null,
        location: location || null,
        startAt: startDate,
        endAt: endDate,
        capacity,
        pointsBudget,
        managerId: requestingUserId
      }
    });
    
    return event;
  }
  
  // Get events with filtering
  static async getEvents(filters = {}) {
    const { name = '', location = '', startDate = '', endDate = '', page = 1, limit = 10 } = filters;
    
    // Build where clause
    const where = {};
    
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    
    if (startDate) {
      where.startAt = { gte: new Date(startDate) };
    }
    
    if (endDate) {
      where.endAt = { lte: new Date(endDate) };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Get total count
    const count = await prisma.event.count({ where });
    
    // Get events with pagination
    const events = await prisma.event.findMany({
      where,
      include: {
        manager: {
          select: { id: true, utorid: true, name: true }
        },
        organizers: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        },
        guests: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        }
      },
      orderBy: { startAt: 'asc' },
      skip,
      take
    });
    
    return {
      count,
      events
    };
  }
  
  // Get event by ID
  static async getEvent(eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        manager: {
          select: { id: true, utorid: true, name: true }
        },
        organizers: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        },
        guests: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        }
      }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    return event;
  }
  
  // Add organizer to event (Manager only)
  static async addEventOrganizer(eventId, userId, requestingUser) {
    if (!this.hasRole(requestingUser.role, 'manager')) {
      throw new Error('Insufficient permissions to manage event organizers');
    }
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is already an organizer
    const existingOrganizer = await prisma.eventOrganizer.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (existingOrganizer) {
      throw new Error('User is already an organizer for this event');
    }
    
    // Check if user is already a guest (organizers cannot be guests)
    const existingGuest = await prisma.eventGuest.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (existingGuest) {
      throw new Error('User is already a guest for this event. Organizers cannot be guests.');
    }
    
    // Add organizer
    const organizer = await prisma.eventOrganizer.create({
      data: {
        userId: userId,
        eventId: eventId
      },
      include: {
        user: {
          select: { id: true, utorid: true, name: true }
        }
      }
    });
    
    return organizer;
  }
  
  // Remove organizer from event (Manager only)
  static async removeEventOrganizer(eventId, userId, requestingUser) {
    if (!this.hasRole(requestingUser.role, 'manager')) {
      throw new Error('Insufficient permissions to manage event organizers');
    }
    
    // Check if organizer exists
    const organizer = await prisma.eventOrganizer.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (!organizer) {
      throw new Error('User is not an organizer for this event');
    }
    
    // Remove organizer
    await prisma.eventOrganizer.delete({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    return { message: 'Organizer removed successfully' };
  }
  
  // Update event (Organizer only)
  static async updateEvent(eventId, updateData, requestingUser) {
    // Check if user is an organizer for this event
    const isOrganizer = await prisma.eventOrganizer.findUnique({
      where: {
        userId_eventId: {
          userId: requestingUser.id,
          eventId: eventId
        }
      }
    });
    
    if (!isOrganizer) {
      throw new Error('Insufficient permissions to update this event');
    }
    
    // Validate update data
    this.validateEventUpdate(updateData);
    
    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: {
        manager: {
          select: { id: true, utorid: true, name: true }
        },
        organizers: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        },
        guests: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        }
      }
    });
    
    return updatedEvent;
  }
  
  // Validate event update data
  static validateEventUpdate(updateData) {
    const { name, description, location, startAt, endAt, capacity, pointsBudget } = updateData;
    
    // Validate name
    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        throw new Error('Name is required');
      }
      if (name.length < 1 || name.length > 100) {
        throw new Error('Name must be 1-100 characters long');
      }
    }
    
    // Validate dates
    if (startAt !== undefined) {
      const startDate = new Date(startAt);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format');
      }
      if (startDate < new Date()) {
        throw new Error('Start date cannot be in the past');
      }
    }
    
    if (endAt !== undefined) {
      const endDate = new Date(endAt);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format');
      }
    }
    
    // Validate capacity
    if (capacity !== undefined) {
      if (capacity <= 0) {
        throw new Error('Capacity must be positive');
      }
    }
    
    // Validate points budget
    if (pointsBudget !== undefined) {
      if (pointsBudget <= 0) {
        throw new Error('Points budget must be positive');
      }
    }
    
    return true;
  }
  
  // Add guest to event (RSVP management)
  static async addEventGuest(eventId, userId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is already a guest
    const existingGuest = await prisma.eventGuest.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (existingGuest) {
      throw new Error('User is already a guest for this event');
    }
    
    // Check if user is already an organizer (organizers cannot be guests)
    const existingOrganizer = await prisma.eventOrganizer.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (existingOrganizer) {
      throw new Error('User is an organizer for this event. Organizers cannot be guests.');
    }
    
    // Check capacity
    const currentGuests = await prisma.eventGuest.count({
      where: { eventId: eventId }
    });
    
    if (currentGuests >= event.capacity) {
      throw new Error('Event is at capacity');
    }
    
    // Add guest
    const guest = await prisma.eventGuest.create({
      data: {
        userId: userId,
        eventId: eventId,
        rsvp: true
      },
      include: {
        user: {
          select: { id: true, utorid: true, name: true }
        }
      }
    });
    
    return guest;
  }
  
  // Remove guest from event
  static async removeEventGuest(eventId, userId, requestingUser) {
    // Check if guest exists
    const guest = await prisma.eventGuest.findUnique({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    if (!guest) {
      throw new Error('User is not a guest for this event');
    }
    
    // Remove guest
    await prisma.eventGuest.delete({
      where: {
        userId_eventId: {
          userId: userId,
          eventId: eventId
        }
      }
    });
    
    return { message: 'Guest removed successfully' };
  }
  
  // Self RSVP to event
  static async selfRSVP(eventId, requestingUser) {
    return await this.addEventGuest(eventId, requestingUser.id, requestingUser);
  }
  
  // Get event transactions (event-award transactions)
  static async getEventTransactions(eventId) {
    // Get all transactions for this event
    const transactions = await prisma.transaction.findMany({
      where: {
        type: 'event',
        // We need to link transactions to events somehow
        // This would require adding an eventId field to transactions
        // For now, we'll return empty array as the schema doesn't include this
      },
      include: {
        createdBy: {
          select: { id: true, utorid: true, name: true }
        },
        targetUser: {
          select: { id: true, utorid: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return transactions;
  }
  
  // Award points to confirmed attendees (Organizer only)
  static async awardPointsToAttendees(eventId, pointsPerPerson, requestingUser) {
    // Check if user is an organizer for this event
    const isOrganizer = await prisma.eventOrganizer.findUnique({
      where: {
        userId_eventId: {
          userId: requestingUser.id,
          eventId: eventId
        }
      }
    });
    
    if (!isOrganizer) {
      throw new Error('Insufficient permissions to award points for this event');
    }
    
    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get confirmed attendees
    const confirmedGuests = await prisma.eventGuest.findMany({
      where: {
        eventId: eventId,
        attended: true
      },
      include: {
        user: {
          select: { id: true, utorid: true, name: true }
        }
      }
    });
    
    if (confirmedGuests.length === 0) {
      throw new Error('No confirmed attendees to award points to');
    }
    
    // Check if we have enough points budget
    const totalPointsNeeded = confirmedGuests.length * pointsPerPerson;
    if (totalPointsNeeded > event.pointsBudget) {
      throw new Error('Insufficient points budget for this award');
    }
    
    // Create transactions for each confirmed attendee
    const transactions = [];
    for (const guest of confirmedGuests) {
      const transaction = await prisma.transaction.create({
        data: {
          type: 'event',
          amountCents: pointsPerPerson,
          pointsDelta: pointsPerPerson,
          createdById: requestingUser.id,
          targetUserId: guest.userId,
          processed: true,
          processedAt: new Date()
        }
      });
      transactions.push(transaction);
    }
    
    // Update event points budget
    await prisma.event.update({
      where: { id: eventId },
      data: {
        pointsBudget: event.pointsBudget - totalPointsNeeded
      }
    });
    
    return {
      message: `Points awarded to ${confirmedGuests.length} attendees`,
      totalPointsAwarded: totalPointsNeeded,
      remainingBudget: event.pointsBudget - totalPointsNeeded,
      transactions
    };
  }
  
  // Validate filter parameters
  static validateFilterParams(params) {
    const { page, limit, role, verified, activated } = params;
    
    // Validate page
    if (page && (isNaN(page) || parseInt(page) < 1)) {
      throw new Error('Page must be a positive integer');
    }
    
    // Validate limit
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      throw new Error('Limit must be between 1 and 100');
    }
    
    // Validate role
    if (role && !['regular', 'cashier', 'manager', 'superuser'].includes(role)) {
      throw new Error('Invalid role filter');
    }
    
    // Validate verified
    if (verified && !['true', 'false'].includes(verified)) {
      throw new Error('Verified filter must be true or false');
    }
    
    // Validate activated
    if (activated && !['true', 'false'].includes(activated)) {
      throw new Error('Activated filter must be true or false');
    }
    
    return true;
  }
  
  // Get single user with role-aware field projection
  static async getUser(userId, requestingUser) {
    const requestingUserRole = requestingUser.role;
    
    if (requestingUserRole === 'cashier') {
      // Cashiers can only see limited information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          utorid: true,
          name: true,
          points: true,
          verified: true,
          promotions: {
            where: {
              usedAt: null,
              promotion: {
                startAt: { lte: new Date() },
                endAt: { gte: new Date() }
              }
            },
            select: {
              promotion: {
                select: {
                  id: true,
                  name: true,
                  minSpending: true,
                  rate: true,
                  points: true
                }
              }
            }
          }
        }
      });
      
      if (user) {
        return {
          id: user.id,
          utorid: user.utorid,
          name: user.name,
          points: user.points,
          verified: user.verified,
          promotions: user.promotions.map(p => ({
            id: p.promotion.id,
            name: p.promotion.name,
            minSpending: p.promotion.minSpending,
            rate: p.promotion.rate,
            points: p.promotion.points
          }))
        };
      }
      return user;
    } else {
      // Managers and superusers can see full information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          utorid: true,
          name: true,
          email: true,
          birthday: true,
          role: true,
          points: true,
          createdAt: true,
          lastLogin: true,
          verified: true,
          avatarUrl: true,
          promotions: {
            where: {
              usedAt: null,
              promotion: {
                startAt: { lte: new Date() },
                endAt: { gte: new Date() }
              }
            },
            select: {
              promotion: {
                select: {
                  id: true,
                  name: true,
                  minSpending: true,
                  rate: true,
                  points: true
                }
              }
            }
          }
        }
      });
      
      if (user) {
        return {
          id: user.id,
          utorid: user.utorid,
          name: user.name,
          email: user.email,
          birthday: user.birthday,
          role: user.role,
          points: user.points,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          verified: user.verified,
          avatarUrl: user.avatarUrl,
          promotions: user.promotions.map(p => ({
            id: p.promotion.id,
            name: p.promotion.name,
            minSpending: p.promotion.minSpending,
            rate: p.promotion.rate,
            points: p.promotion.points
          }))
        };
      }
      return user;
    }
  }
  
  // Create promotion
  static async createPromotion(promotionData, requestingUser) {
    const { name, description, type, startTime, endTime, minSpending, rate, points } = promotionData;
    const requestingUserId = requestingUser.id;
    const requestingUserRole = requestingUser.role;
    
    // Validate required fields
    if (!name || !description || !type || !startTime || !endTime) {
      throw new Error('Name, description, type, startTime, and endTime are required');
    }
    
    // Validate type
    if (!['automatic', 'one-time'].includes(type)) {
      throw new Error('Type must be either "automatic" or "one-time"');
    }
    
    // Validate times
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      throw new Error('End time must be after start time');
    }
    
    if (start <= new Date()) {
      throw new Error('Start time must not be in the past');
    }
    
    // Create promotion
    const promotion = await prisma.promotion.create({
      data: {
        name,
        description,
        type,
        startAt: start,
        endAt: end,
        minSpendingCents: minSpending ? Math.round(minSpending * 100) : null,
        rateMultiplier: rate || null,
        oneTimePoints: points || null
      }
    });
    
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      startTime: promotion.startAt.toISOString(),
      endTime: promotion.endAt.toISOString(),
      minSpending: promotion.minSpendingCents ? promotion.minSpendingCents / 100 : null,
      rate: promotion.rateMultiplier,
      points: promotion.oneTimePoints
    };
  }
  
  // Get promotions with role-aware filtering
  static async getPromotions(filters = {}, requestingUser) {
    const { name, type, started, ended, page = 1, limit = 10 } = filters;
    const requestingUserRole = requestingUser.role;
    
    // Build where clause
    const where = {};
    
    if (name) {
      where.name = { contains: name };
    }
    
    if (type) {
      where.type = type;
    }
    
    if (requestingUserRole === 'regular') {
      // Regular users can only see active promotions they haven't used
      where.startAt = { lte: new Date() };
      where.endAt = { gte: new Date() };
    } else {
      // Managers can see all promotions with additional filters
      if (started !== undefined) {
        if (started === 'true') {
          where.startAt = { lte: new Date() };
        } else {
          where.startAt = { gt: new Date() };
        }
      }
      
      if (ended !== undefined) {
        if (ended === 'true') {
          where.endAt = { lt: new Date() };
        } else {
          where.endAt = { gte: new Date() };
        }
      }
    }
    
    // Get total count
    const count = await prisma.promotion.count({ where });
    
    // Get promotions
    const promotions = await prisma.promotion.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startAt: 'desc' }
    });
    
    // Format results
    const results = promotions.map(promotion => ({
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      endTime: promotion.endAt.toISOString(),
      minSpending: promotion.minSpendingCents ? promotion.minSpendingCents / 100 : null,
      rate: promotion.rateMultiplier,
      points: promotion.oneTimePoints
    }));
    
    return { count, results };
  }
  
  // Get single promotion
  static async getPromotion(promotionId, requestingUser) {
    const requestingUserRole = requestingUser.role;
    
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });
    
    if (!promotion) {
      throw new Error('Promotion not found');
    }
    
    // Regular users can only see active promotions
    if (requestingUserRole === 'regular') {
      const now = new Date();
      if (promotion.startAt > now || promotion.endAt < now) {
        throw new Error('Promotion not found');
      }
    }
    
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      endTime: promotion.endAt.toISOString(),
      minSpending: promotion.minSpendingCents ? promotion.minSpendingCents / 100 : null,
      rate: promotion.rateMultiplier,
      points: promotion.oneTimePoints
    };
  }
  
  // Update promotion
  static async updatePromotion(promotionId, updateData, requestingUser) {
    const { name, description, type, startTime, endTime, minSpending, rate, points } = updateData;
    
    // Check if promotion exists
    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });
    
    if (!existingPromotion) {
      throw new Error('Promotion not found');
    }
    
    // Validate times if provided
    if (startTime || endTime) {
      const start = startTime ? new Date(startTime) : existingPromotion.startAt;
      const end = endTime ? new Date(endTime) : existingPromotion.endAt;
      
      if (start >= end) {
        throw new Error('End time must be after start time');
      }
      
      if (start <= new Date()) {
        throw new Error('Start time must not be in the past');
      }
    }
    
    // Update promotion
    const updatedPromotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(type && { type }),
        ...(startTime && { startAt: new Date(startTime) }),
        ...(endTime && { endAt: new Date(endTime) }),
        ...(minSpending !== undefined && { minSpendingCents: minSpending ? Math.round(minSpending * 100) : null }),
        ...(rate !== undefined && { rateMultiplier: rate }),
        ...(points !== undefined && { oneTimePoints: points })
      }
    });
    
    return {
      id: updatedPromotion.id,
      name: updatedPromotion.name,
      type: updatedPromotion.type,
      endTime: updatedPromotion.endAt.toISOString()
    };
  }
  
  // Delete promotion
  static async deletePromotion(promotionId, requestingUser) {
    // Check if promotion exists
    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    });
    
    if (!existingPromotion) {
      throw new Error('Promotion not found');
    }
    
    // Check if promotion has started
    if (existingPromotion.startAt <= new Date()) {
      throw new Error('Cannot delete promotion that has already started');
    }
    
    // Delete promotion
    await prisma.promotion.delete({
      where: { id: promotionId }
    });
  }
  
  // Get all transactions with filtering
  static async getTransactions(filters = {}) {
    const {
      name = '',
      createdBy = '',
      suspicious = '',
      promotionId = '',
      type = '',
      relatedId = '',
      amount = '',
      operator = '',
      page = 1,
      limit = 10
    } = filters;
    
    // Build where clause
    const where = {};
    
    if (name) {
      where.OR = [
        { targetUser: { utorid: { contains: name } } },
        { targetUser: { name: { contains: name } } }
      ];
    }
    
    if (createdBy) {
      where.createdBy = { utorid: { contains: createdBy } };
    }
    
    if (suspicious !== '') {
      where.suspicious = suspicious === 'true';
    }
    
    if (promotionId) {
      where.promotions = {
        some: { promotionId: parseInt(promotionId) }
      };
    }
    
    if (type) {
      where.type = type;
    }
    
    if (relatedId) {
      where.relatedId = parseInt(relatedId);
    }
    
    if (amount && operator) {
      const amountValue = parseInt(amount);
      if (operator === 'gte') {
        where.amount = { gte: amountValue };
      } else if (operator === 'lte') {
        where.amount = { lte: amountValue };
      }
    }
    
    // Get total count
    const count = await prisma.transaction.count({ where });
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, utorid: true, name: true }
        },
        targetUser: {
          select: { id: true, utorid: true, name: true }
        },
        promotions: {
          include: {
            promotion: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    
    // Format results
    const results = transactions.map(transaction => ({
      id: transaction.id,
      utorid: transaction.targetUser.utorid,
      amount: transaction.amount,
      type: transaction.type,
      spent: transaction.spent,
      promotionIds: transaction.promotions.map(p => p.promotionId),
      suspicious: transaction.suspicious,
      remark: transaction.remark,
      createdBy: transaction.createdBy.utorid,
      relatedId: transaction.relatedId,
      redeemed: transaction.type === 'redemption' ? Math.abs(transaction.amount) : undefined
    }));
    
    return { count, results };
  }
  
  // Flag transaction as suspicious
  static async flagTransactionAsSuspicious(transactionId, suspicious) {
    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { targetUser: true }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { suspicious }
    });
    
    // If marking as suspicious, deduct points
    if (suspicious && !transaction.suspicious) {
      await prisma.user.update({
        where: { id: transaction.targetUserId },
        data: {
          points: { decrement: transaction.amount }
        }
      });
    }
    
    // If unmarking as suspicious, add points back
    if (!suspicious && transaction.suspicious) {
      await prisma.user.update({
        where: { id: transaction.targetUserId },
        data: {
          points: { increment: transaction.amount }
        }
      });
    }
    
    return {
      id: updatedTransaction.id,
      utorid: transaction.targetUser.utorid,
      type: updatedTransaction.type,
      spent: updatedTransaction.spent,
      amount: updatedTransaction.amount,
      promotionIds: [],
      suspicious: updatedTransaction.suspicious,
      remark: updatedTransaction.remark,
      createdBy: transaction.createdBy.utorid
    };
  }
  
  // Process transaction
  static async processTransaction(transactionId) {
    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { targetUser: true }
    });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.type !== 'redemption') {
      throw new Error('Transaction is not of type "redemption"');
    }
    
    if (transaction.processed) {
      throw new Error('Transaction has already been processed');
    }
    
    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { 
        processed: true,
        processedAt: new Date()
      }
    });
    
    // Deduct points from user
    await prisma.user.update({
      where: { id: transaction.targetUserId },
      data: {
        points: { decrement: Math.abs(transaction.amount) }
      }
    });
    
    return {
      id: updatedTransaction.id,
      utorid: transaction.targetUser.utorid,
      type: updatedTransaction.type,
      processedBy: transaction.createdBy.utorid,
      amount: updatedTransaction.amount,
      remark: updatedTransaction.remark,
      createdBy: transaction.createdBy.utorid
    };
  }
  
  // Delete event
  static async deleteEvent(eventId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if event has been published
    if (event.published) {
      throw new Error('Cannot delete event that has already been published');
    }
    
    // Delete event
    await prisma.event.delete({
      where: { id: eventId }
    });
  }
  
  // Add event organizer
  static async addEventOrganizer(eventId, utorid, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if event has ended
    if (event.endTime < new Date()) {
      throw new Error('Event has ended');
    }
    
    // Find user by utorid
    const user = await prisma.user.findUnique({
      where: { utorid }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is already a guest
    const existingGuest = await prisma.eventGuest.findFirst({
      where: {
        eventId,
        userId: user.id
      }
    });
    
    if (existingGuest) {
      throw new Error('User is registered as a guest to the event (remove user as guest first, then retry)');
    }
    
    // Add organizer
    await prisma.eventOrganizer.create({
      data: {
        eventId,
        userId: user.id
      }
    });
    
    // Get updated event with organizers
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizers: {
          include: {
            user: {
              select: { id: true, utorid: true, name: true }
            }
          }
        }
      }
    });
    
    return {
      id: updatedEvent.id,
      name: updatedEvent.name,
      location: updatedEvent.location,
      organizers: updatedEvent.organizers.map(org => ({
        id: org.user.id,
        utorid: org.user.utorid,
        name: org.user.name
      }))
    };
  }
  
  // Remove event organizer
  static async removeEventOrganizer(eventId, userId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if organizer exists
    const organizer = await prisma.eventOrganizer.findFirst({
      where: {
        eventId,
        userId
      }
    });
    
    if (!organizer) {
      throw new Error('Organizer not found');
    }
    
    // Remove organizer
    await prisma.eventOrganizer.delete({
      where: { id: organizer.id }
    });
  }
  
  // Add event guest
  static async addEventGuest(eventId, utorid, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if event has ended
    if (event.endTime < new Date()) {
      throw new Error('Event has ended');
    }
    
    // Check if event is full
    if (event.capacity && event.capacity > 0) {
      const guestCount = await prisma.eventGuest.count({
        where: { eventId }
      });
      
      if (guestCount >= event.capacity) {
        throw new Error('Event is full');
      }
    }
    
    // Find user by utorid
    const user = await prisma.user.findUnique({
      where: { utorid }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user is already an organizer
    const existingOrganizer = await prisma.eventOrganizer.findFirst({
      where: {
        eventId,
        userId: user.id
      }
    });
    
    if (existingOrganizer) {
      throw new Error('User is registered as an organizer (remove user as organizer first, then retry)');
    }
    
    // Add guest
    await prisma.eventGuest.create({
      data: {
        eventId,
        userId: user.id
      }
    });
    
    // Get updated event
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    return {
      id: updatedEvent.id,
      name: updatedEvent.name,
      location: updatedEvent.location,
      guestAdded: {
        id: user.id,
        utorid: user.utorid,
        name: user.name
      },
      numGuests: await prisma.eventGuest.count({
        where: { eventId }
      })
    };
  }
  
  // Remove event guest
  static async removeEventGuest(eventId, userId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if guest exists
    const guest = await prisma.eventGuest.findFirst({
      where: {
        eventId,
        userId
      }
    });
    
    if (!guest) {
      throw new Error('Guest not found');
    }
    
    // Remove guest
    await prisma.eventGuest.delete({
      where: { id: guest.id }
    });
  }
  
  // Self RSVP to event
  static async selfRSVPEvent(eventId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if event has ended
    if (event.endTime < new Date()) {
      throw new Error('Event has ended');
    }
    
    // Check if event is full
    if (event.capacity && event.capacity > 0) {
      const guestCount = await prisma.eventGuest.count({
        where: { eventId }
      });
      
      if (guestCount >= event.capacity) {
        throw new Error('Event is full');
      }
    }
    
    // Check if user is already a guest
    const existingGuest = await prisma.eventGuest.findFirst({
      where: {
        eventId,
        userId: requestingUser.id
      }
    });
    
    if (existingGuest) {
      throw new Error('User is already on the guest list');
    }
    
    // Add guest
    await prisma.eventGuest.create({
      data: {
        eventId,
        userId: requestingUser.id
      }
    });
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: requestingUser.id },
      select: { id: true, utorid: true, name: true }
    });
    
    return {
      id: event.id,
      name: event.name,
      location: event.location,
      guestAdded: {
        id: user.id,
        utorid: user.utorid,
        name: user.name
      },
      numGuests: await prisma.eventGuest.count({
        where: { eventId }
      })
    };
  }
  
  // Self un-RSVP from event
  static async selfUnRSVPEvent(eventId, requestingUser) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Check if event has ended
    if (event.endTime < new Date()) {
      throw new Error('Event has ended');
    }
    
    // Check if user is a guest
    const guest = await prisma.eventGuest.findFirst({
      where: {
        eventId,
        userId: requestingUser.id
      }
    });
    
    if (!guest) {
      throw new Error('User did not RSVP to this event');
    }
    
    // Remove guest
    await prisma.eventGuest.delete({
      where: { id: guest.id }
    });
  }
}

module.exports = AuthService;
