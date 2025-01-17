import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { WebSearchMessage } from '../web-search-agent/types';
import type { ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam, ChatCompletionAssistantMessageParam } from 'openai/resources/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, context } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Format context and messages for the LLM
    const contextText = context?.length > 0
      ? `Context from previous searches:\n${context.map((item: any, index: number) => 
          `[${index + 1}] ${item.snippet || item.content}`
        ).join('\n')}\n\n`
      : '';

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: `You are a helpful AI assistant. ${contextText}Please use the provided context to help answer the user's questions when relevant.`
    };

    const conversationMessages = messages.map((msg: WebSearchMessage) => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: msg.content
        } as ChatCompletionUserMessageParam;
      } else {
        return {
          role: 'assistant',
          content: msg.content
        } as ChatCompletionAssistantMessageParam;
      }
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...conversationMessages],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('LLM chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 