'use strict';

// Must mock supabase before requiring anything that imports it
jest.mock('../utils/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  requestLogger: (req, _res, next) => {
    req.id = 'test-req-id';
    next();
  },
}));

jest.mock('../docGenerator/index', () => ({
  generateDoc: jest.fn().mockResolvedValue(Buffer.from('mock-docx')),
}));

// Suppress rate limiter in tests
jest.mock('../config/rateLimit', () => ({
  generalLimiter: (_req, _res, next) => next(),
  generateLimiter: (_req, _res, next) => next(),
}));

const request = require('supertest');

// Must require app AFTER mocks are set up
let app;
beforeAll(() => {
  // Set NODE_ENV to 'production' so server.js doesn't call app.listen() (avoids EADDRINUSE)
  process.env.NODE_ENV = 'production';
  app = require('../server');
});

// Helper: all requests need x-forwarded-proto: https in production mode
// to avoid the HTTPS redirect middleware returning 301
const agent = () => request(app);
const HTTPS_HEADER = { 'x-forwarded-proto': 'https' };

describe('Server integration tests', () => {
  // ── Health check ─────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    test('returns 200 with success status', async () => {
      const res = await agent().get('/api/health').set(HTTPS_HEADER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ── 404 catch-all ────────────────────────────────────────────────────
  describe('API 404 catch-all', () => {
    test('returns 404 for unknown API routes', async () => {
      const res = await agent().get('/api/nonexistent').set(HTTPS_HEADER);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Not found');
    });

    test('includes method and URL in 404 error', async () => {
      const res = await agent().post('/api/something').set(HTTPS_HEADER);
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('POST');
      expect(res.body.error).toContain('/api/something');
    });
  });

  // ── CSP report endpoint ──────────────────────────────────────────────
  describe('POST /csp-report', () => {
    test('returns 204 with no body', async () => {
      const res = await agent()
        .post('/csp-report')
        .set(HTTPS_HEADER)
        .set('Content-Type', 'application/csp-report')
        .send(JSON.stringify({ 'csp-report': { 'blocked-uri': 'https://evil.com', 'violated-directive': 'script-src' } }));
      expect(res.status).toBe(204);
    });
  });

  // ── HTTPS redirect ──────────────────────────────────────────────────
  describe('HTTPS redirect', () => {
    test('redirects HTTP to HTTPS in production', async () => {
      // Do NOT set x-forwarded-proto — simulates plain HTTP
      const res = await agent().get('/api/health');
      expect(res.status).toBe(301);
      expect(res.headers.location).toMatch(/^https:\/\//);
    });
  });

  // ── POST /generate — auth errors ────────────────────────────────────
  describe('POST /generate', () => {
    test('returns 401 without Authorization header', async () => {
      const res = await agent()
        .post('/generate')
        .set(HTTPS_HEADER)
        .send({ orgName: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('returns 401 with invalid token', async () => {
      const { supabaseAdmin } = require('../utils/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'invalid token' },
      });

      const res = await agent()
        .post('/generate')
        .set(HTTPS_HEADER)
        .set('Authorization', 'Bearer bad-token')
        .send({ orgName: 'Test' });
      expect(res.status).toBe(401);
    });

    test('returns 400 on validation failure (missing required fields)', async () => {
      const { supabaseAdmin } = require('../utils/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'a@b.com' } },
        error: null,
      });

      const res = await agent()
        .post('/generate')
        .set(HTTPS_HEADER)
        .set('Authorization', 'Bearer good-token')
        .send({ orgName: 'Test' }); // missing most required fields

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid input');
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    test('returns DOCX on valid request', async () => {
      const { supabaseAdmin } = require('../utils/supabase');
      supabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'a@b.com' } },
        error: null,
      });

      const res = await agent()
        .post('/generate')
        .set(HTTPS_HEADER)
        .set('Authorization', 'Bearer good-token')
        .send({
          orgName: 'Acme Corp',
          officeAddress: '123 Main St',
          signatoryName: 'Jane',
          signatoryDesig: 'CEO',
          empFullName: 'John Smith',
          designation: 'Engineer',
          annualCTC: 1200000,
          offerDate: '2026-03-01',
          offerValidity: '2026-03-15',
          joiningDate: '2026-04-01',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('officedocument');
      expect(res.headers['content-disposition']).toContain('Offer_John Smith.docx');
    });
  });

  // ── Error handling ───────────────────────────────────────────────────
  describe('error handling', () => {
    test('returns 400 for malformed JSON body', async () => {
      const res = await agent()
        .post('/generate')
        .set(HTTPS_HEADER)
        .set('Content-Type', 'application/json')
        .send('{malformed json');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Malformed JSON');
    });
  });
});
