import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Permission,
  Role,
  hasPermission,
  validateChannelAccess,
  assignRole,
  updateChannelPermissions,
} from '../../lib/accessControl';

// Create mock client
const mockClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnValue({
    data: { role: 'user' },
    error: null,
  }),
  upsert: vi.fn().mockReturnThis(),
};

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockClient,
}));

describe('Access Control Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockClient).forEach(fn => {
      if (typeof fn === 'function') {
        fn.mockClear();
      }
    });
  });

  describe('hasPermission', () => {
    it('should grant read permission to user role', async () => {
      const result = await hasPermission('user123', Permission.READ);
      expect(result).toBe(true);
    });

    it('should deny write permission to user role', async () => {
      const result = await hasPermission('user123', Permission.WRITE);
      expect(result).toBe(false);
    });

    it('should handle channel-specific permissions', async () => {
      const result = await hasPermission('user123', Permission.READ, 'channel123');
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockClient.single.mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      const result = await hasPermission('user123', Permission.READ);
      expect(result).toBe(false);
    });
  });

  describe('validateChannelAccess', () => {
    it('should validate accessible channels', async () => {
      const channels = ['channel1', 'channel2'];
      const result = await validateChannelAccess('user123', channels);
      expect(result).toEqual(channels);
    });

    it('should filter inaccessible channels', async () => {
      mockClient.single.mockReturnValueOnce({
        data: null,
        error: new Error('No access'),
      });
      const channels = ['channel1', 'channel2'];
      const result = await validateChannelAccess('user123', channels);
      expect(result.length).toBeLessThan(channels.length);
    });
  });

  describe('assignRole', () => {
    it('should allow admin to assign roles', async () => {
      mockClient.single.mockReturnValueOnce({
        data: { role: 'admin' },
        error: null,
      });
      const result = await assignRole('admin123', 'user123', Role.MODERATOR);
      expect(result).toBe(true);
    });

    it('should prevent non-admin from assigning roles', async () => {
      const result = await assignRole('user123', 'user456', Role.MODERATOR);
      expect(result).toBe(false);
    });
  });

  describe('updateChannelPermissions', () => {
    it('should allow admin to update channel permissions', async () => {
      mockClient.single.mockReturnValueOnce({
        data: { role: 'admin' },
        error: null,
      });
      const result = await updateChannelPermissions(
        'admin123',
        'user123',
        'channel123',
        [Permission.READ, Permission.WRITE]
      );
      expect(result).toBe(true);
    });

    it('should prevent non-admin from updating permissions', async () => {
      const result = await updateChannelPermissions(
        'user123',
        'user456',
        'channel123',
        [Permission.READ]
      );
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.upsert.mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      const result = await updateChannelPermissions(
        'admin123',
        'user123',
        'channel123',
        [Permission.READ]
      );
      expect(result).toBe(false);
    });
  });
}); 