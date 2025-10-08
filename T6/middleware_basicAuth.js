// middleware/basicAuth.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Basic access authentication middleware.
 * - If no Authorization header: req.user = null; next()
 * - If header present but invalid credentials: 401 { message: "Invalid credentials" }
 * - On success: req.user is the user row
 */
const basicAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    req.user = null;
    return next();
  }

  // Expected format: "Basic <base64(username:password)>"
  const [scheme, encoded] = authHeader.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  let decoded;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const sep = decoded.indexOf(':');
  if (sep === -1) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const username = decoded.slice(0, sep);
  const password = decoded.slice(sep + 1);

  try {
    const user = await prisma.user.findFirst({
      where: { username, password },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.user = user;
    return next();
  } catch (e) {
    // Fallback: treat as invalid credentials per spec
    return res.status(401).json({ message: 'Invalid credentials' });
  }
};

module.exports = basicAuth;