const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generateDoc } = require('./docGenerator/index');
const { supabaseAdmin } = require('./utils/supabase');
const { validateGeneratePayload } = require('./validation');
const { logAudit } = require('./utils/audit');
const { verifyAuth } = require('./middleware/auth');
const log = require('./utils/logger');
const { corsOptions } = require('./config/cors');
const { generalLimiter, generateLimiter } = require('./config/rateLimit');

const app = express();
const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy when running behind Vercel/reverse proxy (needed for accurate rate limiting by IP)
if (isProduction) {
  app.set('trust proxy', 1);

  // HTTPS enforcement: redirect HTTP -> HTTPS in production.
  // Behind Vercel's proxy, the original protocol is in x-forwarded-proto.
  app.use((req, res, next) => {
    if (req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
    next();
  });
}

// ── REQUEST CORRELATION IDs & LOGGING ──────────────────────────────────────
app.use(log.requestLogger);

// ── STEP 6: SECURITY HEADERS (helmet) ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      connectSrc: [
        "'self'",
        "https://jccvqxsobciorrniqlod.supabase.co",
        "wss://jccvqxsobciorrniqlod.supabase.co",
      ],
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      reportUri: '/csp-report',
    },
  },
  // HSTS: tell browsers to always use HTTPS for 1 year, include subdomains
  hsts: {
    maxAge: 31536000,       // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false, // Allow loading external fonts/CDN resources
}));

// Permissions-Policy header — restrict access to sensitive browser APIs
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  next();
});

// ── STEP 5: CORS RESTRICTION ──────────────────────────────────────────────
app.use(cors(corsOptions));

// ── STEP 4: RATE LIMITING ──────────────────────────────────────────────────
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));

// Static file serving with cache headers
// CSS/JS/images: cache for 1 day (browser will revalidate after)
// HTML: no cache (always get fresh version)
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: isProduction ? '1d' : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ── DOCUMENT GENERATION ──────────────────────────────────────────────────────

app.post('/generate', generateLimiter, verifyAuth, async (req, res) => {
  try {
    // Step 3: Validate input
    const validation = validateGeneratePayload(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validation.errors,
      });
    }

    const validatedData = validation.data;
    const buffer = await generateDoc(validatedData);
    const empName = (validatedData.empFullName || 'Letter').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Letter';
    const filename = `Offer_${empName}.docx`;

    // Upload the generated DOCX to Supabase Storage
    const userId = req.user.id;
    const offerId = validatedData._offerId || 'unknown'; // Validated UUID from Zod schema
    const storagePath = `${userId}/${offerId}/${filename}`;
    let doc_url = null;

    try {
      // Security: Verify the offer belongs to the authenticated user before uploading.
      // This prevents a malicious user from passing someone else's offerId to overwrite their docs.
      let ownershipVerified = false;
      if (offerId && offerId !== 'unknown') {
        const { data: offerRow, error: lookupErr } = await supabaseAdmin
          .from('offers')
          .select('id')
          .eq('id', offerId)
          .eq('user_id', userId)
          .single();

        if (lookupErr || !offerRow) {
          log.warn('Ownership check failed', { reqId: req.id, offerId, userId });
          // Skip upload but still return the generated document to the client
        } else {
          ownershipVerified = true;
        }
      } else {
        // No offerId provided — allow upload under 'unknown' folder (backward compat)
        ownershipVerified = true;
      }

      if (ownershipVerified) {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('offer-docs')
          .upload(storagePath, buffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true,
          });

        if (uploadError) {
          log.error('Storage upload failed', { reqId: req.id, error: uploadError.message });
        } else {
          doc_url = storagePath;

          // Update the offer record with doc_url if offerId is available
          if (offerId && offerId !== 'unknown') {
            await supabaseAdmin
              .from('offers')
              .update({ doc_url: storagePath })
              .eq('id', offerId)
              .eq('user_id', userId);
          }
        }
      }
    } catch (storageErr) {
      log.error('Storage upload error', { reqId: req.id, error: storageErr.message });
      // Don't fail the request — still send the DOCX to the client
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);

    // Step 7: Audit log (fire-and-forget, don't block response)
    logAudit({
      user_id: req.user.id,
      action: 'generate_document',
      resource_type: 'offer_letter',
      details: { emp_name: empName, designation: validatedData.designation || '', doc_url: doc_url || '' },
    }).catch(err => log.error('Audit log failed', { reqId: req.id, error: err.message }));

  } catch (err) {
    log.error('DocGen Error', { reqId: req.id, error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to generate document' });
  }
});

// ── OFFER MANAGEMENT (CRUD) ──────────────────────────────────────────────────
// CRUD operations are handled directly by the frontend Supabase client
// (which is authenticated and respects RLS). Legacy backend CRUD routes
// have been removed to eliminate the risk of bypassing RLS via supabaseAdmin.
// If backend CRUD is needed in the future, use a per-request Supabase client
// initialized with the user's JWT token to respect RLS policies.

// ── HEALTH CHECK ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── CSP VIOLATION REPORTS ─────────────────────────────────────────────────
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body?.['csp-report'] || req.body;
  log.warn('CSP violation', {
    blockedUri: report?.['blocked-uri'],
    violatedDirective: report?.['violated-directive'],
    documentUri: report?.['document-uri'],
  });
  res.status(204).end();
});

// ── CENTRALIZED ERROR HANDLING ────────────────────────────────────────────

// 404 — Catch unmatched API routes (static files already handled by express.static)
app.all('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (must have 4 parameters for Express to recognize it)
// Catches: CORS errors, JSON parse errors, unhandled throws in middleware/routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // CORS rejection from the origin callback
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: 'Origin not allowed by CORS policy.' });
  }

  // Malformed JSON body (SyntaxError from express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Malformed JSON in request body.' });
  }

  // Payload too large (from express.json({ limit }))
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body too large.' });
  }

  // Log unexpected errors
  log.error('Unhandled error', { reqId: req.id, error: err.message, stack: err.stack });

  // Don't leak internal details in production
  const message = isProduction
    ? 'Internal server error.'
    : err.message || 'Internal server error.';

  res.status(err.status || 500).json({ success: false, error: message });
});

// Start server only in local dev (Vercel uses the exported app)
if (!isProduction) {
  const server = app.listen(PORT, () => {
    log.info('Server started', { url: `http://localhost:${PORT}` });
  });

  // Graceful shutdown — close connections on SIGTERM/SIGINT
  const shutdown = (signal) => {
    log.info(`${signal} received, shutting down gracefully…`);
    server.close(() => {
      log.info('Server closed');
      process.exit(0);
    });
    // Force exit if not closed within 10 seconds
    setTimeout(() => {
      log.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

module.exports = app;
