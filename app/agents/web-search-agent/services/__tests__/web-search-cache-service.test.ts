/// <reference types="jest" />
import '@testing-library/jest-dom';
import { WebSearchCacheService } from '../web-search-cache-service';
import { WebSearchResponse } from '../../types';

describe('WebSearchCacheService', () => {
  let service: WebSearchCacheService;
  let mockDate: number;

  const mockResponse: WebSearchResponse = {
    results: [
      {
        title: 'Test Result',
        url: 'https://test.com',
        snippet: 'Test snippet',
        position: 1
      }
    ],
    totalResults: 1,
    searchTime: 0.5
  };

  beforeEach(() => {
    mockDate = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate);
    service = new WebSearchCacheService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('basic cache operations', () => {
    it('stores and retrieves values', () => {
      service.set('test query', mockResponse);
      const result = service.get('test query');
      expect(result).toEqual(mockResponse);
    });

    it('returns null for non-existent keys', () => {
      const result = service.get('non-existent');
      expect(result).toBeNull();
    });

    it('considers settings when storing and retrieving', () => {
      const settings = { maxResults: 10 };
      service.set('test query', mockResponse, settings);
      
      // Should hit with same settings
      const hit = service.get('test query', settings);
      expect(hit).toEqual(mockResponse);

      // Should miss with different settings
      const miss = service.get('test query', { maxResults: 5 });
      expect(miss).toBeNull();
    });
  });

  describe('cache expiration', () => {
    it('expires entries after TTL', () => {
      service.set('test query', mockResponse);
      
      // Move time forward just before TTL
      mockDate = 1000 + WebSearchCacheService['TTL'] - 1;
      let result = service.get('test query');
      expect(result).toEqual(mockResponse);

      // Move time forward past TTL
      mockDate = 1000 + WebSearchCacheService['TTL'] + 1;
      result = service.get('test query');
      expect(result).toBeNull();
    });

    it('cleans up expired entries during operations', () => {
      service.set('query1', mockResponse);
      mockDate += 100;
      service.set('query2', mockResponse);

      // Move time forward past TTL for first entry
      mockDate = 1000 + WebSearchCacheService['TTL'] + 1;
      
      // This should trigger cleanup
      service.set('query3', mockResponse);

      // First entry should be gone
      expect(service.get('query1')).toBeNull();
      // Second entry should still be there
      expect(service.get('query2')).toEqual(mockResponse);
    });
  });

  describe('cache size management', () => {
    it('enforces maximum entries limit', () => {
      // Fill cache to max
      for (let i = 0; i < WebSearchCacheService['MAX_ENTRIES']; i++) {
        service.set(`query${i}`, mockResponse);
        mockDate += 100; // Space out timestamps
      }

      // Add one more entry
      service.set('overflow', mockResponse);

      // Oldest entry should be removed
      expect(service.get('query0')).toBeNull();
      // Newest entries should remain
      expect(service.get('overflow')).toEqual(mockResponse);
    });

    it('removes oldest entries when over limit', () => {
      // Add entries with different timestamps
      for (let i = 0; i < WebSearchCacheService['MAX_ENTRIES'] + 5; i++) {
        service.set(`query${i}`, mockResponse);
        mockDate += 100;
      }

      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(WebSearchCacheService['MAX_ENTRIES']);
    });
  });

  describe('cache statistics', () => {
    it('provides accurate cache stats', () => {
      service.set('query1', mockResponse);
      mockDate += 1000;
      service.set('query2', mockResponse);

      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.oldestEntry).toBe(1000);
      expect(stats.newestEntry).toBe(2000);
    });

    it('updates stats after clearing cache', () => {
      service.set('query1', mockResponse);
      service.set('query2', mockResponse);
      
      service.clear();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });
}); 