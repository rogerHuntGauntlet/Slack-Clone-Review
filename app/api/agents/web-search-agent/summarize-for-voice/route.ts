import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { content, searchResults } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Create a voice-friendly summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that creates voice-friendly summaries. Create a concise, conversational summary that:
1. Is easy to listen to (2-3 sentences max)
2. Focuses on the most important information
3. Uses natural, spoken language
4. Avoids technical jargon unless necessary
5. Includes a brief mention of sources if relevant
6. Is engaging and personable

Remember: This will be read aloud, so optimize for listening comprehension.`
        },
        {
          role: 'user',
          content: `Please create a voice-friendly summary of this response:

Content: ${content}
${searchResults ? `\nBased on search results from: ${searchResults.map((r: any) => r.title).join(', ')}` : ''}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150, // Keep it concise for voice
    });

    const voiceSummary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    return NextResponse.json({ voiceSummary });

  } catch (error) {
    console.error('Error generating voice summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice summary' },
      { status: 500 }
    );
  }
} 