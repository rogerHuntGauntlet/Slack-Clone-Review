import { NextResponse } from 'next/server';
import type { WebSearchMessage, WebSearchResult } from '../../types';

export async function POST(request: Request) {
  try {
    const { messages, searchResults, summaries, useRag } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (useRag && (!searchResults || !Array.isArray(searchResults))) {
      return NextResponse.json(
        { error: 'Search results array is required for RAG mode' },
        { status: 400 }
      );
    }

    let prompt: string;

    if (useRag) {
      // Prepare the prompt with context from web search
      const searchContext = searchResults
        .map((result: WebSearchResult, index: number) => {
          const summary = summaries[index] || result.snippet;
          return `[Source ${index + 1}]: ${result.title}\n${summary}\nURL: ${result.url}\n`;
        })
        .join('\n');

      // Format conversation history
      const conversationHistory = messages
        .map((msg: WebSearchMessage) => `${msg.role}: ${msg.content}`)
        .join('\n');

      // For now, return a mock response that uses the search results
      const mockResponse = {
        message: `Based on the search results, I can provide some information about your query. According to [Source 1] (${searchResults[0].url}), ${searchResults[0].snippet} Additionally, [Source 2] (${searchResults[1].url}) mentions that ${searchResults[1].snippet}`
      };

      return NextResponse.json(mockResponse);
    } else {
      // Format conversation history for direct chat mode
      const conversationHistory = messages
        .map((msg: WebSearchMessage) => `${msg.role}: ${msg.content}`)
        .join('\n');

      // For direct chat mode, return a simple response
      const mockResponse = {
        message: "I understand your question. Let me help you with that. Since we're in direct chat mode, I'll use my general knowledge to assist you. What specific aspects would you like to know more about?"
      };

      return NextResponse.json(mockResponse);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 