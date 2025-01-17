export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  searchTime: number;
}

export interface WebSearchMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  citations?: WebSearchCitation[];
}

export interface WebSearchCitation {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
}

export interface WebSearchSettings {
  maxResults: number;
  searchEngine: 'google' | 'bing';
  includeImages: boolean;
  safeModeEnabled: boolean;
} 