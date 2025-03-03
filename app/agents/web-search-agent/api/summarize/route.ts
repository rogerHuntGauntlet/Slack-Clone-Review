import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchAndExtractContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, iframe, noscript').remove();

    // Get main content
    const mainContent = $('main, article, .content, #content, .main').text() || $('body').text();
    
    // Clean up text
    return mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Failed to fetch URL content');
  }
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
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Extract content from URL
    const content = await fetchAndExtractContent(url);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes web content. Create a concise but informative summary of the provided content.'
        },
        {
          role: 'user',
          content: content.substring(0, 4000) // Limit content length
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Error in summarize:', error);
    return NextResponse.json(
      { error: 'Failed to summarize content' },
      { status: 500 }
    );
  }
} 