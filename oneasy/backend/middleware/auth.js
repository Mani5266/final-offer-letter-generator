'use strict';

/**
 * Auth middleware removed - no authentication required.
 * This is a passthrough middleware for backward compatibility.
 */
const verifyAuth = (req, res, next) => {
  next();
};

module.exports = { verifyAuth };
