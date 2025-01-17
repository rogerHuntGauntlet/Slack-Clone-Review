import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedContent {
  mainText: string;
  lists: {
    bullets: string[];
    numbered: string[];
  };
  headings: string[];
}

async function fetchAndExtractContent(url: string): Promise<ExtractedContent> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, iframe, noscript').remove();

    // Extract lists
    const bullets: string[] = [];
    const numbered: string[] = [];
    
    // Get bullet points
    $('ul li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) bullets.push(text);
    });

    // Get numbered lists
    $('ol li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) numbered.push(text);
    });

    // Get headings
    const headings: string[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    // Get main content with better paragraph handling
    let mainText = '';
    $('main, article, .content, #content, .main, body').find('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        mainText += text + '\n\n';
      }
    });

    // Clean up text
    mainText = mainText
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();

    return {
      mainText,
      lists: {
        bullets,
        numbered
      },
      headings
    };
  } catch (error) {
    console.error('Error fetching URL:', error);
    throw new Error('Failed to fetch URL content');
  }
}

function formatSummaryPrompt(content: ExtractedContent): string {
  let prompt = '';

  // Add headings if available
  if (content.headings.length > 0) {
    prompt += 'Document Structure:\n';
    content.headings.forEach(heading => {
      prompt += `- ${heading}\n`;
    });
    prompt += '\n';
  }

  // Add main content
  prompt += 'Main Content:\n' + content.mainText + '\n\n';

  // Add lists if available
  if (content.lists.bullets.length > 0) {
    prompt += 'Bullet Points:\n';
    content.lists.bullets.forEach(item => {
      prompt += `• ${item}\n`;
    });
    prompt += '\n';
  }

  if (content.lists.numbered.length > 0) {
    prompt += 'Numbered List:\n';
    content.lists.numbered.forEach((item, index) => {
      prompt += `${index + 1}. ${item}\n`;
    });
  }

  return prompt;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
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
    const formattedPrompt = formatSummaryPrompt(content);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that summarizes web content. Create a well-structured summary that:
1. Starts with a brief overview
2. Maintains the document's structure (headings, lists, etc.)
3. Uses bullet points for key points
4. Preserves any important lists from the original
5. Keeps paragraphs short and readable
6. Uses proper formatting and spacing`
        },
        {
          role: 'user',
          content: formattedPrompt.substring(0, 4000) // Limit content length
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    return NextResponse.json({
      summary,
      structure: {
        hasHeadings: content.headings.length > 0,
        hasBulletPoints: content.lists.bullets.length > 0,
        hasNumberedLists: content.lists.numbered.length > 0
      }
    });

  } catch (error) {
    console.error('Error in summarize:', error);
    return NextResponse.json(
      { error: 'Failed to summarize content' },
      { status: 500 }
    );
  }
} 