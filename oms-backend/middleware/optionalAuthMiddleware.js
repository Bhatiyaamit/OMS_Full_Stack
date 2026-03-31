const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

/**
 * optionalProtect
 *
 * Like `protect`, but does NOT reject unauthenticated requests.
 * If a valid JWT cookie is present, it populates req.user.
 * If not (guest), it simply calls next() with req.user === undefined.
 *
 * Use this on public endpoints that optionally benefit from knowing
 * who is calling (e.g. GET /products for guests vs admins).
 */
const optionalProtect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return next(); // Guest — no token, that's fine

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (user) req.user = user; // Attach user if found
  } catch (_err) {
    // Invalid / expired token — treat as guest
  }
  next();
};

module.exports = { optionalProtect };
