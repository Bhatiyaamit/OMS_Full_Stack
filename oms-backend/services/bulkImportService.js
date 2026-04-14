const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const prisma = require("../config/db");
const cloudinary = require("../config/cloudinary");

// ── Resolve a temp directory for extraction ──────────────
const EXTRACT_ROOT = path.join(__dirname, "../uploads/bulk_tmp");

/**
 * Core service: process bulk ZIP upload
 * @param {string} zipFilePath  - absolute path to the uploaded .zip on disk
 * @returns {Object}            - { imported, skipped, errors }
 */
const processBulkImport = async (zipFilePath) => {
  // 1. Create a unique temp folder for this import
  const sessionDir = path.join(EXTRACT_ROOT, `import_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    // 2. Extract the ZIP
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(sessionDir, true);

    // 3. Find products.xlsx inside the extracted content
    const xlsxPath = findFile(sessionDir, "products.xlsx");
    if (!xlsxPath) {
      throw new Error("products.xlsx not found in the ZIP file.");
    }

    // 4. Parse Excel → JSON rows
    const workbook = XLSX.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      throw new Error("products.xlsx is empty — no rows to import.");
    }

    // 5. Find the images/ folder inside extracted content (may be nested)
    const imagesDir = findDir(sessionDir, "images");

    // 6. Process each row
    const results = await Promise.allSettled(
      rows.map((row) => processRow(row, imagesDir)),
    );

    // 7. Separate successes from failures
    const importedProducts = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        importedProducts.push(result.value);
      } else {
        errors.push({
          row: index + 2, // +2 because row 1 = header, index 0 = row 2
          reason: result.reason?.message || "Unknown error",
        });
      }
    });

    // 8. Bulk insert all valid products using Prisma transaction
    let inserted = 0;
    if (importedProducts.length > 0) {
      const created = await prisma.$transaction(
        importedProducts.map((p) => prisma.product.create({ data: p })),
      );
      inserted = created.length;
    }

    return {
      imported: inserted,
      skipped: errors.length,
      errors,
    };
  } finally {
    // 9. Always clean up: temp extract dir + uploaded zip
    cleanup(sessionDir);
    cleanup(zipFilePath);
  }
};

// ── Process a single Excel row ────────────────────────────
const processRow = async (row, imagesDir) => {
  const name = String(row.name || "").trim();
  const description = String(row.description || "").trim();
  const price = parseFloat(row.price);
  const stock = parseInt(row.stock, 10);
  const imageFile = String(row.image || "").trim();

  // Validate required fields
  if (!name) throw new Error("Missing required field: name");
  if (!description) throw new Error("Missing required field: description");
  if (isNaN(price) || price < 0) throw new Error("Invalid price value");
  if (isNaN(stock) || stock < 0) throw new Error("Invalid stock value");

  // Check for duplicate product name in DB
  const existing = await prisma.product.findUnique({ where: { name } });
  if (existing) throw new Error(`Product "${name}" already exists`);

  // Upload image to Cloudinary (if provided and found on disk)
  let imageUrl = null;
  if (imageFile && imagesDir) {
    const imagePath = path.join(imagesDir, imageFile);
    if (fs.existsSync(imagePath)) {
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: "oms/products",
        transformation: [
          { width: 800, height: 800, crop: "limit", quality: "auto" },
        ],
      });
      imageUrl = result.secure_url;
    }
    // If image file not found — continue without image (no hard failure)
  }

  return { name, description, price, stock, image: imageUrl };
};

// ── Utility: recursively find a file by name ─────────────
const findFile = (dir, filename) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, filename);
      if (found) return found;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
};

// ── Utility: recursively find a directory by name ────────
const findDir = (dir, dirName) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === dirName) return full;
      const found = findDir(full, dirName);
      if (found) return found;
    }
  }
  return null;
};

// ── Utility: safely delete a file or directory ───────────
const cleanup = (targetPath) => {
  try {
    if (!targetPath || !fs.existsSync(targetPath)) return;
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
  } catch {
    // Silent — cleanup failure should never crash the import
  }
};

module.exports = { processBulkImport };
