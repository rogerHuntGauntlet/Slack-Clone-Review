import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

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

    // Format results
    const results = data.items?.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      position: item.position || 0
    })) || [];

    return NextResponse.json({
      results,
      totalResults: data.searchInformation?.totalResults || 0,
      searchTime: data.searchInformation?.searchTime || 0
    });

  } catch (error) {
    console.error('Error in web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search' },
      { status: 500 }
    );
  }
} 