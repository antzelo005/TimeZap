const jwt = require("jsonwebtoken");
const { createAppError } = require("../utils/validators");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createAppError(401, "Authorization token is required");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(createAppError(401, "Invalid or expired token"));
    }

    return next(error);
  }
}

module.exports = authMiddleware;
