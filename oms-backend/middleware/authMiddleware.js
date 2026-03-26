const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) throw new ApiError(401, "Not authenticated — no token");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) throw new ApiError(401, "User not found");

  req.user = user;
  next();
});

module.exports = { protect };
