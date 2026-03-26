const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { upload } = require("../services/uploadService");

// Public — all authenticated roles
router.get("/", protect, getAllProducts);
router.get("/:id", protect, getProductById);

// Admin only
router.post(
  "/",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  createProduct,
);
router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  upload.single("image"),
  updateProduct,
);
router.delete("/:id", protect, authorize("ADMIN"), deleteProduct);

module.exports = router;
