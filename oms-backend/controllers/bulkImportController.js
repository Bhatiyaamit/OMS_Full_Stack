const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { processBulkImport } = require("../services/bulkImportService");

/**
 * POST /api/products/bulk-import
 * Thin controller — delegates all business logic to the service layer.
 */
const bulkImportProducts = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please upload a .zip file");
  }

  const result = await processBulkImport(req.file.path);

  res.status(207).json({
    success: true,
    message: `Import complete. ${result.imported} product(s) imported, ${result.skipped} skipped.`,
    data: {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    },
  });
});

module.exports = { bulkImportProducts };
