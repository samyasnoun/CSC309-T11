// middleware/optionalAuth.js
// Attaches req.auth if valid token is present, but doesn't fail if missing

const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    
    if (!match) {
      // No token present, continue as anonymous
      return next();
    }

    const token = match[1];
    const secret = process.env.JWT_SECRET || "secretkey";

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      
      if (payload && payload.userId) {
        req.auth = { userId: payload.userId };
        
        // Optionally attach req.me for convenience
        const user = await prisma.user.findUnique({ 
          where: { id: payload.userId } 
        });
        if (user) {
          req.me = user;
        }
      }
    } catch (tokenErr) {
      // Invalid token - continue as anonymous
      // Don't throw; just proceed without auth
    }

    next();
  } catch (err) {
    // Unexpected error - continue as anonymous to be safe
    next();
  }
}

module.exports = { optionalAuth };
