import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { WebSearchResult } from '@/app/agents/web-search-agent/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const {
      messages,
      searchResults,
      summaries,
      agentId,
      useRag,
      ragResults,
      llmResults,
      summaryResults,
    } = await request.json();

    if (!messages || !agentId) {
      return NextResponse.json(
        { error: 'Messages and agent ID are required' },
        { status: 400 }
      );
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, description')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Format search results for context
    const searchContext = searchResults?.length ? `
Here are the relevant search results:
${searchResults.map((result: WebSearchResult, index: number) => `
[${index + 1}] ${result.title}
URL: ${result.url}
Snippet: ${result.snippet}
${summaries?.[index] ? `Summary: ${summaries[index]}` : ''}`).join('\n')}
` : '';

    // Format RAG results for context
    const ragContext = ragResults?.length ? `
Here are relevant results from your knowledge base:
${ragResults.map((result: any, index: number) => `
[${index + 1}] Content: ${result.content}
Source: ${result.fileName}
Relevance: ${result.score}`).join('\n')}
` : '';

    // Create messages array
    const chatMessages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are ${agent.name}, an AI agent with web search capabilities. ${agent.description || ''}

Your goal is to help users by providing accurate and helpful information based on web search results and your knowledge base.

${searchContext}
${ragContext}
${llmResults ? `\nPrevious analysis: ${llmResults}` : ''}
${summaryResults ? `\nSummary: ${summaryResults}` : ''}

Instructions:
1. Use the provided search results and knowledge base to inform your responses
2. Cite your sources when referencing specific information
3. Be direct and concise in your responses
4. If you're unsure about something, admit it
5. Don't make up information
6. Keep responses focused and relevant`
      },
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    ];

    // Generate response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500
    });

    const message = completion.choices[0].message.content;

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
} 