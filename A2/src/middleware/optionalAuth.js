// middleware/optionalAuth.js
// Middleware that optionally attaches auth info if token is present, but doesn't require it

const { verifyToken } = require("../services/jwt");

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  
  if (!match) {
    // No token provided - continue without auth
    return next();
  }
  
  try {
    const token = match[1];
    const payload = await verifyToken(token);
    req.auth = { userId: payload.id };
  } catch (err) {
    // Invalid token - just continue without auth (don't fail the request)
  }
  
  next();
}

module.exports = { optionalAuth };

