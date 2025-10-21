const express = require('express');
const { 
  jwtAuth, 
  requireAny, 
  requireRegular, 
  requireCashier, 
  requireOrganizer, 
  requireManager, 
  requireSuperuser 
} = require('../middleware/auth');

const router = express.Router();

// Test route for any authenticated user
router.get('/any', jwtAuth, requireAny, (req, res) => {
  res.json({ 
    message: 'Any authenticated user can access this',
    user: req.auth 
  });
});

// Test route for regular users and above
router.get('/regular', jwtAuth, requireRegular, (req, res) => {
  res.json({ 
    message: 'Regular users and above can access this',
    user: req.auth 
  });
});

// Test route for cashiers and above
router.get('/cashier', jwtAuth, requireCashier, (req, res) => {
  res.json({ 
    message: 'Cashiers and above can access this',
    user: req.auth 
  });
});

// Test route for organizers and above
router.get('/organizer', jwtAuth, requireOrganizer, (req, res) => {
  res.json({ 
    message: 'Organizers and above can access this',
    user: req.auth 
  });
});

// Test route for managers and above
router.get('/manager', jwtAuth, requireManager, (req, res) => {
  res.json({ 
    message: 'Managers and above can access this',
    user: req.auth 
  });
});

// Test route for superusers only
router.get('/superuser', jwtAuth, requireSuperuser, (req, res) => {
  res.json({ 
    message: 'Only superusers can access this',
    user: req.auth 
  });
});

// Test route for unauthenticated users
router.get('/public', (req, res) => {
  res.json({ 
    message: 'This is a public endpoint',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

