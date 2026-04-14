const multer = require("multer");
const path = require("path");
const ApiError = require("../utils/ApiError");

// Store the ZIP file temporarily on disk before processing
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const unique = `bulk_${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const zipFilter = (req, file, cb) => {
  const allowed = [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ext === ".zip") {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only .zip files are allowed for bulk import"), false);
  }
};

const uploadZip = multer({
  storage,
  fileFilter: zipFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for ZIP
});

module.exports = { uploadZip };
