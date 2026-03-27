'use strict';

// Mock supabase
const mockInsert = jest.fn();
jest.mock('../utils/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { logAudit } = require('../utils/audit');
const { supabaseAdmin } = require('../utils/supabase');
const log = require('../utils/logger');

describe('logAudit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('inserts correct payload into audit_logs', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await logAudit({
      user_id: 'user-123',
      action: 'generate_document',
      resource_type: 'offer_letter',
      resource_id: 'offer-456',
      details: { emp_name: 'John' },
    });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      action: 'generate_document',
      resource: 'offer_letter:offer-456',
      details: { emp_name: 'John' },
    });
  });

  test('builds resource as "type:id" when both provided', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await logAudit({
      user_id: 'u1',
      action: 'test',
      resource_type: 'auth',
      resource_id: 'r1',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'auth:r1' })
    );
  });

  test('uses resource_type only when resource_id is missing', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await logAudit({
      user_id: 'u1',
      action: 'auth_failed',
      resource_type: 'auth',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'auth' })
    );
  });

  test('uses null resource when resource_type is missing', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await logAudit({
      user_id: 'u1',
      action: 'test',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ resource: null })
    );
  });

  test('uses null for details when not provided', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await logAudit({
      user_id: 'u1',
      action: 'test',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ details: null })
    );
  });

  test('never throws on insert failure — logs error instead', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB unavailable' } });

    // Should NOT throw
    await expect(logAudit({
      user_id: 'u1',
      action: 'test',
    })).resolves.toBeUndefined();

    expect(log.error).toHaveBeenCalledWith(
      'Audit log insert failed',
      expect.objectContaining({ error: 'DB unavailable' })
    );
  });

  test('never throws on exception — logs error instead', async () => {
    mockInsert.mockRejectedValue(new Error('Network error'));

    await expect(logAudit({
      user_id: 'u1',
      action: 'test',
    })).resolves.toBeUndefined();

    expect(log.error).toHaveBeenCalledWith(
      'Audit log error',
      expect.objectContaining({ error: 'Network error' })
    );
  });
});
