import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

function formatSnippet(snippet: string): string {
  // Replace HTML entities
  let formatted = snippet
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Handle numbered lists (e.g., "1. ", "2. ")
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');

  // Handle bullet points
  formatted = formatted.replace(/([•·*-]\s)/g, '\n$1');

  // Handle paragraphs (double line breaks)
  formatted = formatted.replace(/\.\s+([A-Z])/g, '.\n\n$1');

  // Clean up extra whitespace
  formatted = formatted
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();

  return formatted;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Get search API key from environment
    const searchApiKey = process.env.SEARCH_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;

    if (!searchApiKey || !searchEngineId) {
      return NextResponse.json(
        { error: 'Search service not configured' },
        { status: 503 }
      );
    }

    // Call Google Custom Search API
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Search request failed');
    }

    // Format results with better text handling
    const results = data.items?.map((item: any) => {
      // Extract any list items from HTML content if available
      const listItems: string[] = [];
      if (item.htmlSnippet) {
        const matches = item.htmlSnippet.match(/<li>(.+?)<\/li>/g);
        if (matches) {
          matches.forEach((match: string) => {
            const content = match.replace(/<\/?[^>]+(>|$)/g, '');
            listItems.push(content);
          });
        }
      }

      return {
        title: item.title,
        url: item.link,
        snippet: formatSnippet(item.snippet || ''),
        listItems: listItems.length > 0 ? listItems : undefined,
        position: item.position || 0,
        // Include additional metadata if available
        datePublished: item.pagemap?.metatags?.[0]?.['article:published_time'],
        author: item.pagemap?.metatags?.[0]?.['article:author'],
        siteName: item.pagemap?.metatags?.[0]?.['og:site_name']
      };
    }) || [];

    return NextResponse.json({
      results,
      totalResults: data.searchInformation?.totalResults || 0,
      searchTime: data.searchInformation?.searchTime || 0,
      formattingApplied: true // Flag to indicate enhanced formatting
    });

  } catch (error) {
    console.error('Error in web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
} 