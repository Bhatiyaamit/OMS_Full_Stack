const multer = require("multer");
const path = require("path");
const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");

// Store file temporarily on disk before streaming to Cloudinary
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only JPEG, PNG and WebP images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Upload local file to Cloudinary, return secure URL
const uploadToCloudinary = async (localFilePath, folder = "oms") => {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder,
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  });

  // Delete temp file after upload
  const fs = require("fs");
  fs.unlink(localFilePath, () => {});

  return result.secure_url;
};

// Delete image from Cloudinary using its URL
const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return;
  // Extract public_id from URL  e.g. oms/products/abc123
  const parts = imageUrl.split("/");
  const filename = parts[parts.length - 1].split(".")[0];
  const folder = parts[parts.length - 2];
  const publicId = `${folder}/${filename}`;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
