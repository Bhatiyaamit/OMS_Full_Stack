const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const { registerSchema, loginSchema } = require("../validators/auth.schema");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(422, parsed.error.errors[0].message);
  }

  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already in use");

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || "CUSTOMER" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  generateToken(res, user.id, user.role);

  res.status(201).json({ success: true, data: user });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(422, parsed.error.errors[0].message);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  generateToken(res, user.id, user.role);

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = { register, login, getMe, logout };
