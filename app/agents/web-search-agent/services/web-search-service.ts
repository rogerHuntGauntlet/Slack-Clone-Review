import { WebSearchResponse, WebSearchSettings } from '../types';

class WebSearchService {
  private settings: WebSearchSettings = {
    maxResults: 5,
    searchEngine: 'google',
    includeImages: false,
    safeModeEnabled: true,
  };

  constructor() {
    // Initialize with environment variables if available
    if (process.env.NEXT_PUBLIC_SEARCH_ENGINE) {
      this.settings.searchEngine = process.env.NEXT_PUBLIC_SEARCH_ENGINE as 'google' | 'bing';
    }
  }

  public updateSettings(newSettings: Partial<WebSearchSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public async search(query: string): Promise<WebSearchResponse> {
    try {
      // TODO: Implement actual search API integration
      const response = await fetch('/api/agents/web-search-agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          settings: this.settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  public async summarizeUrl(url: string): Promise<string> {
    try {
      const response = await fetch('/api/agents/web-search-agent/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('URL summarization failed');
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Summarization error:', error);
      throw error;
    }
  }
}

// Export as singleton
export const webSearchService = new WebSearchService(); 