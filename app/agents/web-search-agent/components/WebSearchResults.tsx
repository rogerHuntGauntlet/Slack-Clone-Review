import React from 'react';
import { WebSearchResult } from '../types';
import { Loader2 } from 'lucide-react';
import { WebSearchCitation } from './WebSearchCitation';

interface WebSearchResultsProps {
  results: WebSearchResult[];
  isLoading: boolean;
  error?: string;
  onResultClick?: (result: WebSearchResult) => void;
}

export const WebSearchResults: React.FC<WebSearchResultsProps> = ({
  results,
  isLoading,
  error,
  onResultClick
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Searching the web...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <WebSearchCitation
          key={`${result.url}-${index}`}
          url={result.url}
          title={result.title}
          snippet={result.snippet}
          relevanceScore={1}
          onClick={() => onResultClick?.(result)}
        />
      ))}
    </div>
  );
}; 