const ApiError = require("../utils/ApiError");

// Usage: authorize('ADMIN', 'MANAGER')
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Role '${req.user.role}' is not allowed here`);
    }
    next();
  };

module.exports = { authorize };
