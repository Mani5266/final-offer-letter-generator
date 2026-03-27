'use strict';

describe('CORS configuration', () => {
  let corsOptions, allowedOrigins;

  // We need to re-require cors.js per test group because it reads NODE_ENV at import time
  afterEach(() => {
    jest.resetModules();
  });

  describe('production mode', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'production';
      // Mock supabase to prevent .env crash
      jest.mock('../utils/supabase', () => ({
        supabaseAdmin: {},
        supabase: {},
      }));
      const cors = require('../config/cors');
      corsOptions = cors.corsOptions;
      allowedOrigins = cors.allowedOrigins;
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    test('only allows Vercel production origin', () => {
      expect(allowedOrigins).toContain('https://final-offer-letter-generator.vercel.app');
      expect(allowedOrigins).not.toContain('http://localhost:3002');
    });

    test('allows whitelisted origin', (done) => {
      corsOptions.origin('https://final-offer-letter-generator.vercel.app', (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });

    test('blocks non-whitelisted origin', (done) => {
      corsOptions.origin('https://evil-site.com', (err, _result) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('CORS');
        done();
      });
    });

    test('allows no-origin requests (same-origin / server-to-server)', (done) => {
      corsOptions.origin(undefined, (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('development mode', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      jest.mock('../utils/supabase', () => ({
        supabaseAdmin: {},
        supabase: {},
      }));
      const cors = require('../config/cors');
      corsOptions = cors.corsOptions;
      allowedOrigins = cors.allowedOrigins;
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    test('includes localhost origins in development', () => {
      expect(allowedOrigins).toContain('http://localhost:3002');
      expect(allowedOrigins).toContain('http://localhost:5500');
      expect(allowedOrigins).toContain('http://127.0.0.1:5500');
    });

    test('still includes Vercel origin', () => {
      expect(allowedOrigins).toContain('https://final-offer-letter-generator.vercel.app');
    });

    test('allows localhost origin', (done) => {
      corsOptions.origin('http://localhost:3002', (err, result) => {
        expect(err).toBeNull();
        expect(result).toBe(true);
        done();
      });
    });
  });

  describe('corsOptions settings', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.mock('../utils/supabase', () => ({
        supabaseAdmin: {},
        supabase: {},
      }));
      const cors = require('../config/cors');
      corsOptions = cors.corsOptions;
    });

    test('has credentials enabled', () => {
      expect(corsOptions.credentials).toBe(true);
    });

    test('exposes Content-Disposition header', () => {
      expect(corsOptions.exposedHeaders).toContain('Content-Disposition');
    });
  });
});
