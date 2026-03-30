'use strict';

describe('logger', () => {
  let originalEnv;
  let stdoutSpy, stderrSpy;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('development mode', () => {
    let log;

    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      log = require('../utils/logger');
    });

    test('info writes to stdout', () => {
      log.info('Server started', { port: 3002 });
      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0];
      expect(output).toContain('INFO');
      expect(output).toContain('Server started');
    });

    test('error writes to stderr', () => {
      log.error('Something broke', { err: 'oops' });
      expect(stderrSpy).toHaveBeenCalled();
      const output = stderrSpy.mock.calls[0][0];
      expect(output).toContain('ERROR');
      expect(output).toContain('Something broke');
    });

    test('warn writes to stdout', () => {
      log.warn('Warning message');
      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0];
      expect(output).toContain('WARN');
    });

    test('debug is visible in development', () => {
      log.debug('Debug info');
      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0];
      expect(output).toContain('DEBUG');
    });

    test('includes meta as JSON when provided', () => {
      log.info('Test', { key: 'value' });
      const output = stdoutSpy.mock.calls[0][0];
      expect(output).toContain('"key"');
      expect(output).toContain('"value"');
    });

    test('omits meta when empty', () => {
      log.info('Simple message');
      const output = stdoutSpy.mock.calls[0][0];
      // Should end with message + newline, no JSON braces
      expect(output.trim()).toMatch(/Simple message$/);
    });
  });

  describe('production mode', () => {
    let log;

    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'production';
      log = require('../utils/logger');
    });

    test('info writes JSON to stdout', () => {
      log.info('Request completed', { status: 200 });
      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('info');
      expect(parsed.msg).toBe('Request completed');
      expect(parsed.status).toBe(200);
      expect(parsed.ts).toBeDefined();
    });

    test('error writes JSON to stderr', () => {
      log.error('Crash', { stack: 'trace' });
      expect(stderrSpy).toHaveBeenCalled();
      const output = stderrSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('error');
      expect(parsed.msg).toBe('Crash');
    });

    test('debug is suppressed in production', () => {
      log.debug('Secret debug');
      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe('requestLogger middleware', () => {
    let log;

    beforeEach(() => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      log = require('../utils/logger');
    });

    test('assigns req.id as 8-char hex string', () => {
      const req = { method: 'GET', originalUrl: '/test' };
      const res = {
        statusCode: 200,
        on: jest.fn(),
      };
      const next = jest.fn();

      log.requestLogger(req, res, next);

      expect(req.id).toBeDefined();
      expect(req.id).toMatch(/^[0-9a-f]{8}$/);
      expect(next).toHaveBeenCalled();
    });

    test('logs on response finish', () => {
      const req = { method: 'GET', originalUrl: '/test' };
      let finishCallback;
      const res = {
        statusCode: 200,
        on: jest.fn((event, cb) => {
          if (event === 'finish') finishCallback = cb;
        }),
      };
      const next = jest.fn();

      log.requestLogger(req, res, next);

      // Simulate response finish
      expect(finishCallback).toBeDefined();
      finishCallback();

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls[0][0];
      expect(output).toContain('Request completed');
    });
  });
});
