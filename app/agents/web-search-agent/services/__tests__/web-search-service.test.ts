/// <reference types="jest" />
import '@testing-library/jest-dom';
import WebSearchService from '../web-search-service';
import { WebSearchCacheService } from '../web-search-cache-service';

// Mock the WebSearchCacheService
jest.mock('../web-search-cache-service');

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WebSearchService', () => {
  let service: WebSearchService;
  const mockSearchResponse = {
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
    jest.clearAllMocks();
    
    // Reset fetch mock
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    });

    // Reset cache service mock
    (WebSearchCacheService as jest.Mock).mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
      set: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, oldestEntry: null, newestEntry: null }),
      clear: jest.fn()
    }));

    service = new WebSearchService();
  });

  describe('search', () => {
    it('performs a search request when no cached result exists', async () => {
      const result = await service.search('test query');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/web-search-agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'test query',
          settings: {
            maxResults: 5,
            searchEngine: 'google',
            includeImages: false,
            safeModeEnabled: true,
          },
        }),
      });
      expect(result).toEqual(mockSearchResponse);
    });

    it('returns cached result when available', async () => {
      const cachedResult = { ...mockSearchResponse };
      (WebSearchCacheService as jest.Mock).mockImplementation(() => ({
        get: jest.fn().mockReturnValue(cachedResult),
        set: jest.fn(),
        getCacheStats: jest.fn(),
        clear: jest.fn()
      }));

      const result = await service.search('test query');
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual(cachedResult);
    });

    it('caches the result after a successful search', async () => {
      const mockCache = {
        get: jest.fn().mockReturnValue(null),
        set: jest.fn(),
        getCacheStats: jest.fn(),
        clear: jest.fn()
      };
      (WebSearchCacheService as jest.Mock).mockImplementation(() => mockCache);

      await service.search('test query');
      
      expect(mockCache.set).toHaveBeenCalledWith(
        'test query',
        mockSearchResponse,
        {
          maxResults: 5,
          searchEngine: 'google',
          includeImages: false,
          safeModeEnabled: true,
        }
      );
    });

    it('throws an error when the search request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(service.search('test query')).rejects.toThrow('Search request failed');
    });
  });

  describe('updateSettings', () => {
    it('updates settings correctly', () => {
      service.updateSettings({ maxResults: 10 });
      expect(service['settings'].maxResults).toBe(10);

      service.updateSettings({ searchEngine: 'bing' });
      expect(service['settings'].searchEngine).toBe('bing');

      service.updateSettings({ includeImages: true });
      expect(service['settings'].includeImages).toBe(true);

      service.updateSettings({ safeModeEnabled: false });
      expect(service['settings'].safeModeEnabled).toBe(false);
    });

    it('maintains existing settings when updating partially', () => {
      const originalSettings = { ...service['settings'] };
      service.updateSettings({ maxResults: 10 });

      expect(service['settings']).toEqual({
        ...originalSettings,
        maxResults: 10
      });
    });
  });

  describe('summarizeUrl', () => {
    it('sends a summarize request for a URL', async () => {
      const mockSummary = 'Test summary';
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ summary: mockSummary })
      });

      const result = await service.summarizeUrl('https://test.com');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/web-search-agent/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: 'https://test.com' }),
      });
      expect(result).toBe(mockSummary);
    });

    it('throws an error when the summarize request fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(service.summarizeUrl('https://test.com')).rejects.toThrow('URL summarization failed');
    });
  });

  describe('cache management', () => {
    it('returns cache stats', () => {
      const mockStats = { size: 5, oldestEntry: 123, newestEntry: 456 };
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        getCacheStats: jest.fn().mockReturnValue(mockStats),
        clear: jest.fn()
      };
      (WebSearchCacheService as jest.Mock).mockImplementation(() => mockCache);

      service = new WebSearchService();
      const stats = service.getCacheStats();
      
      expect(stats).toEqual(mockStats);
    });

    it('clears the cache', () => {
      const mockCache = {
        get: jest.fn(),
        set: jest.fn(),
        getCacheStats: jest.fn(),
        clear: jest.fn()
      };
      (WebSearchCacheService as jest.Mock).mockImplementation(() => mockCache);

      service = new WebSearchService();
      service.clearCache();
      
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
}); 