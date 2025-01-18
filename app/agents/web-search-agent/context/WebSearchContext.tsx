import React, { createContext, useContext, useState, useCallback } from 'react';
import WebSearchService from '../services/web-search-service';
import { WebSearchResult, WebSearchSettings, WebSearchResponse } from '../types';

interface WebSearchContextType {
  results: WebSearchResult[];
  isLoading: boolean;
  error: string | null;
  settings: WebSearchSettings;
  updateSettings: (newSettings: Partial<WebSearchSettings>) => void;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
  cacheStats: {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  };
  clearCache: () => void;
}

const WebSearchContext = createContext<WebSearchContextType | null>(null);

export function useWebSearch() {
  const context = useContext(WebSearchContext);
  if (!context) {
    throw new Error('useWebSearch must be used within a WebSearchProvider');
  }
  return context;
}

export function WebSearchProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<WebSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }>({
    size: 0,
    oldestEntry: null,
    newestEntry: null
  });
  
  const searchService = React.useMemo(() => new WebSearchService(), []);
  const [settings, setSettings] = useState<WebSearchSettings>({
    maxResults: 5,
    searchEngine: 'google',
    includeImages: false,
    safeModeEnabled: true,
  });

  const updateSettings = useCallback((newSettings: Partial<WebSearchSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      searchService.updateSettings(updated);
      return updated;
    });
  }, [searchService]);

  const search = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await searchService.search(query);
      setResults(response.results);
      // Update cache stats after search
      const stats = searchService.getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchService]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  const clearCache = useCallback(() => {
    searchService.clearCache();
    setCacheStats({
      size: 0,
      oldestEntry: null,
      newestEntry: null
    });
  }, [searchService]);

  const value = {
    results,
    isLoading,
    error,
    settings,
    updateSettings,
    search,
    clearResults,
    cacheStats,
    clearCache,
  };

  return (
    <WebSearchContext.Provider value={value}>
      {children}
    </WebSearchContext.Provider>
  );
} 