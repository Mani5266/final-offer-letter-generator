'use strict';

// Mock supabase BEFORE requiring auth module
jest.mock('../utils/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { verifyAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../utils/supabase');

// Helper: create mock req/res/next
function mockReqResNext(authHeader) {
  const req = {
    headers: { authorization: authHeader },
    id: 'test-req-id',
    ip: '127.0.0.1',
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('verifyAuth middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects missing Authorization header', async () => {
    const { req, res, next } = mockReqResNext(undefined);
    await verifyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining('Missing') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects Authorization header without Bearer prefix', async () => {
    const { req, res, next } = mockReqResNext('Token abc123');
    await verifyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects empty token after Bearer', async () => {
    const { req, res, next } = mockReqResNext('Bearer ');
    await verifyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects when Supabase returns error', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const { req, res, next } = mockReqResNext('Bearer valid-token');
    await verifyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Invalid or expired') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects when Supabase returns no user', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { req, res, next } = mockReqResNext('Bearer some-token');
    await verifyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() and sets req.user on valid token', async () => {
    const mockUser = { id: 'user-uuid-123', email: 'test@example.com' };
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { req, res, next } = mockReqResNext('Bearer valid-token');
    await verifyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-uuid-123', email: 'test@example.com' });
    expect(res.status).not.toHaveBeenCalled();
  });

  test('handles thrown exceptions gracefully', async () => {
    supabaseAdmin.auth.getUser.mockRejectedValue(new Error('Network failure'));

    const { req, res, next } = mockReqResNext('Bearer valid-token');
    await verifyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Authentication failed.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('passes correct token to Supabase getUser', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: '1', email: 'a@b.com' } },
      error: null,
    });

    const { req, res, next } = mockReqResNext('Bearer my-jwt-token-xyz');
    await verifyAuth(req, res, next);

    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith('my-jwt-token-xyz');
  });
});
