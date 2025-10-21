const express = require('express');
const AuthController = require('../controllers/authController');
const { jwtAuth, requireAny, requireCashier, requireManager } = require('../middleware/auth');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// User registration (cashiers, managers, superusers only)
router.post('/', jwtAuth, requireCashier, AuthController.registerUser);

// User filtering (managers, superusers only)
router.get('/', jwtAuth, requireManager, AuthController.getUsers);

// User updates (managers, superusers only)
router.get('/:userId', jwtAuth, requireCashier, AuthController.getUser);
router.patch('/:userId', jwtAuth, requireManager, AuthController.updateUser);

// Self profile routes
router.get('/me', jwtAuth, requireAny, AuthController.getSelfProfile);
router.patch('/me', jwtAuth, requireAny, uploadAvatar, handleUploadError, AuthController.updateSelfProfile);
router.patch('/me/password', jwtAuth, requireAny, AuthController.changePassword);

module.exports = router;
