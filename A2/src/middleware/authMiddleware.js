// middleware/authMiddleware.js

const { expressjwt: jwt } = require("express-jwt");
const prisma = require("../prismaClient");

// Middleware that validates JWT but doesn't require it (for optional auth)
const authenticate = jwt({
  secret: process.env.JWT_SECRET || "secretkey",
  algorithms: ["HS256"],
  credentialsRequired: false,
});

function requires(minRole) {
  const ranking = { regular: 1, cashier: 2, manager: 3, superuser: 4 };

  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Load user from database
      const me = await prisma.user.findUnique({ where: { id: req.auth.userId } });
      if (!me) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      req.me = me;

      // Check if user has sufficient clearance
      const userRank = ranking[me.role];
      const requiredRank = ranking[minRole];
      
      if (userRank === undefined || requiredRank === undefined) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (userRank < requiredRank) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Always attach the logged-in user (if any) to req.me */
async function attachUser(req, res, next) {
  if (req.auth?.userId) {
    req.me = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  }
  next();
}

module.exports = { authenticate, requires, attachUser };
