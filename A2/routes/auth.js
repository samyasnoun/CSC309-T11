const express = require('express');
const AuthController = require('../controllers/authController');
const { jwtAuth, requireAny, requireCashier, requireManager } = require('../middleware/auth');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/tokens', AuthController.login); // Login endpoint
router.post('/resets', AuthController.requestReset); // Request reset token
router.post('/resets/:resetToken', AuthController.handleToken); // Activate or reset with token
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/profile', jwtAuth, requireAny, AuthController.getProfile);
router.get('/verify', jwtAuth, requireAny, AuthController.verifyToken);

// Self profile routes
router.get('/me', jwtAuth, requireAny, AuthController.getSelfProfile);
router.patch('/me', jwtAuth, requireAny, uploadAvatar, handleUploadError, AuthController.updateSelfProfile);
router.patch('/me/password', jwtAuth, requireAny, AuthController.changePassword);

// User registration (cashiers, managers, superusers only)
router.post('/register', jwtAuth, requireCashier, AuthController.registerUser);

// User filtering (cashiers, managers, superusers only)
router.get('/users', jwtAuth, requireCashier, AuthController.getUsers);

// User updates (managers, superusers only)
router.put('/users/:userId', jwtAuth, requireManager, AuthController.updateUser);

module.exports = router;
