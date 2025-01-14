import { describe, it, expect } from 'vitest';
import {
  validateSearchRequest,
  validateProcessRequest,
  sanitizeContent,
  validateTokenFormat,
  ValidationError,
} from '../../lib/validation';

describe('Validation Module', () => {
  describe('sanitizeContent', () => {
    it('should remove HTML and script content', () => {
      const input = '<script>alert("xss")</script>Hello<img src="x" onerror="alert(1)">';
      expect(sanitizeContent(input)).toBe('Hello');
    });

    it('should handle multiple spaces and control characters', () => {
      const input = 'Hello  \n\t  World\r\n';
      expect(sanitizeContent(input)).toBe('Hello World');
    });

    it('should return empty string for invalid input', () => {
      const input = null as any;
      expect(sanitizeContent(input)).toBe('');
    });
  });

  describe('validateSearchRequest', () => {
    it('should validate valid search request', async () => {
      const request = {
        query: 'test query',
        filters: {
          channels: ['channel1', 'channel2'],
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-02T00:00:00Z',
          },
        },
      };
      const result = await validateSearchRequest(request);
      expect(result).toMatchObject(request);
    });

    it('should sanitize query in search request', async () => {
      const request = {
        query: '<script>alert("xss")</script>test query',
      };
      const result = await validateSearchRequest(request);
      expect(result.query).toBe('test query');
    });

    it('should reject invalid search request', async () => {
      const request = {
        query: '', // Empty query
      };
      await expect(validateSearchRequest(request)).rejects.toThrow();
    });
  });

  describe('validateProcessRequest', () => {
    it('should validate valid process request', async () => {
      const request = {
        messages: [{
          content: 'test message',
          channelId: 'channel1',
          userId: 'user1',
          timestamp: '2024-01-01T00:00:00Z',
        }],
      };
      const result = await validateProcessRequest(request);
      expect(result).toMatchObject(request);
    });

    it('should sanitize message content', async () => {
      const request = {
        messages: [{
          content: '<script>alert("xss")</script>test message',
          channelId: 'channel1',
          userId: 'user1',
          timestamp: '2024-01-01T00:00:00Z',
        }],
      };
      const result = await validateProcessRequest(request);
      expect(result.messages[0].content).toBe('test message');
    });

    it('should reject request with invalid messages', async () => {
      const request = {
        messages: [{
          content: '', // Empty content
          channelId: 'channel1',
          userId: 'user1',
          timestamp: '2024-01-01T00:00:00Z',
        }],
      };
      await expect(validateProcessRequest(request)).rejects.toThrow();
    });
  });

  describe('validateTokenFormat', () => {
    it('should validate correct JWT format', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(validateTokenFormat(token)).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      const invalidTokens = [
        'not-a-token',
        'only.one.part',
        'too.many.parts.here',
        '',
        'invalid@characters.in.token',
        'header.payload',
        'header.payload.signature.extra',
      ];
      invalidTokens.forEach(token => {
        expect(validateTokenFormat(token)).toBe(false);
      });
    });
  });

  describe('ValidationError', () => {
    it('should create error with details', () => {
      const error = new ValidationError('Test error', { field: 'test' });
      expect(error.message).toBe('Test error');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('ValidationError');
    });
  });
}); 