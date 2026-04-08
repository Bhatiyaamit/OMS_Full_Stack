const { Router } = require("express");
const { getDashboardStats } = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = Router();

// GET /api/dashboard
// Private: Admin/Manager only
router.get("/", protect, authorize("ADMIN", "MANAGER"), getDashboardStats);

module.exports = router;
