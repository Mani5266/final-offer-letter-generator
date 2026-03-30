'use strict';

const rateLimit = require('express-rate-limit');

/**
 * General rate limit: 100 requests per 15 minutes per IP.
 * Applies to all routes.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

/**
 * Strict rate limit for document generation: 10 per hour per IP.
 * Applies only to POST /generate.
 */
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Document generation limit reached. Try again in an hour.' },
});

module.exports = { generalLimiter, generateLimiter };
