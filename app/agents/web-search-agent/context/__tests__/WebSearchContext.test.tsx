/// <reference types="jest" />
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WebSearchProvider, useWebSearch } from '../WebSearchContext';
import WebSearchService from '../../services/web-search-service';

// Mock the WebSearchService
jest.mock('../../services/web-search-service');

const mockSearchResults = {
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

// Test component that uses the context
const TestComponent = () => {
  const { 
    search, 
    results, 
    isLoading, 
    error, 
    settings, 
    updateSettings,
    clearResults,
    clearCache 
  } = useWebSearch();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no error'}</div>
      <div data-testid="results">{JSON.stringify(results)}</div>
      <div data-testid="settings">{JSON.stringify(settings)}</div>
      <button onClick={() => search('test query')}>Search</button>
      <button onClick={() => updateSettings({ maxResults: 10 })}>Update Settings</button>
      <button onClick={clearResults}>Clear Results</button>
      <button onClick={clearCache}>Clear Cache</button>
    </div>
  );
};

describe('WebSearchContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (WebSearchService as jest.Mock).mockImplementation(() => ({
      search: jest.fn().mockResolvedValue(mockSearchResults),
      updateSettings: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, oldestEntry: null, newestEntry: null }),
      clearCache: jest.fn()
    }));
  });

  it('provides default values', () => {
    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
    expect(screen.getByTestId('results')).toHaveTextContent('[]');
    expect(JSON.parse(screen.getByTestId('settings').textContent!)).toEqual({
      maxResults: 5,
      searchEngine: 'google',
      includeImages: false,
      safeModeEnabled: true,
    });
  });

  it('performs search and updates state', async () => {
    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    fireEvent.click(screen.getByText('Search'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('results')).toHaveTextContent(JSON.stringify(mockSearchResults.results));
    });
  });

  it('handles search errors', async () => {
    const mockError = new Error('Search failed');
    (WebSearchService as jest.Mock).mockImplementation(() => ({
      search: jest.fn().mockRejectedValue(mockError),
      updateSettings: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, oldestEntry: null, newestEntry: null }),
      clearCache: jest.fn()
    }));

    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Search failed');
      expect(screen.getByTestId('results')).toHaveTextContent('[]');
    });
  });

  it('updates settings', () => {
    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    fireEvent.click(screen.getByText('Update Settings'));

    expect(JSON.parse(screen.getByTestId('settings').textContent!)).toEqual({
      maxResults: 10,
      searchEngine: 'google',
      includeImages: false,
      safeModeEnabled: true,
    });
  });

  it('clears results', async () => {
    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    // First perform a search
    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByTestId('results')).toHaveTextContent(JSON.stringify(mockSearchResults.results));
    });

    // Then clear results
    fireEvent.click(screen.getByText('Clear Results'));
    expect(screen.getByTestId('results')).toHaveTextContent('[]');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });

  it('clears cache', () => {
    const mockClearCache = jest.fn();
    (WebSearchService as jest.Mock).mockImplementation(() => ({
      search: jest.fn(),
      updateSettings: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({ size: 0, oldestEntry: null, newestEntry: null }),
      clearCache: mockClearCache
    }));

    render(
      <WebSearchProvider>
        <TestComponent />
      </WebSearchProvider>
    );

    fireEvent.click(screen.getByText('Clear Cache'));
    expect(mockClearCache).toHaveBeenCalled();
  });
}); 