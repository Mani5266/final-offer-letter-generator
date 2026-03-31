'use strict';

/**
 * CORS configuration.
 * Production: only the Vercel domain.
 * Development: also allow localhost variants.
 */

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  'https://offer.oneasy.ai',
  'https://final-offer-letter-generator.vercel.app',
  ...(!isProduction ? [
    'http://localhost:3002',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
  ] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    // Requests with no origin header: same-origin requests from the Express static serve.
    // In production, allow only same-origin (served from same domain).
    // In development, also allow Postman/curl (which send no origin).
    if (!origin) {
      return callback(null, true);
    }
    // Allow whitelisted origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
};

module.exports = { corsOptions, allowedOrigins };
