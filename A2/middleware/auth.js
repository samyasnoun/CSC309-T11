const { expressjwt: expressJwt } = require('express-jwt');
const { requireRole, requireAny } = require('../lib/roles');

// JWT authentication middleware
const jwtAuth = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'auth'
});

// Attach user info to request
const attachUserInfo = (req, res, next) => {
  if (req.auth) {
    req.userId = req.auth.userId;
    req.userRole = req.auth.role;
  }
  next();
};

// Clearance level helpers using centralized RBAC
const requireRegular = requireRole('regular');
const requireCashier = requireRole('cashier');
const requireOrganizer = requireRole('organizer');
const requireManager = requireRole('manager');
const requireSuperuser = requireRole('superuser');

module.exports = {
  jwtAuth,
  requireRole,
  requireAny,
  requireRegular,
  requireCashier,
  requireOrganizer,
  requireManager,
  requireSuperuser,
  attachUserInfo
};
