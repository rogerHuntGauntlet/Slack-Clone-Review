import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { AgentRAGService } from '@/app/agents/services/rag-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { messages, stream = false, isRagMode = true, agentId } = await req.json();

    // If in RAG mode, use RAG service to get context
    let enhancedMessages = [...messages];
    if (isRagMode && agentId) {
      const ragService = new AgentRAGService();
      const lastMessage = messages[messages.length - 1].content;
      const results = await ragService.queryAgentKnowledge(agentId, lastMessage, 3);
      
      if (results.length > 0) {
        const context = results
          .map(r => r.content)
          .join('\n\n');

        enhancedMessages = [
          messages[0], // System message
          {
            role: 'system',
            content: `Here is some relevant context to help with your response:\n\n${context}`
          },
          ...messages.slice(1) // User messages and conversation history
        ];
      }
    }

    if (stream) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: enhancedMessages,
        temperature: isRagMode ? 0.7 : 0.9, // More creative in conversation mode
        max_tokens: isRagMode ? 1000 : 500, // Longer responses for RAG evaluation
        stream: true
      });

      // Create a simple text stream
      const stream = new ReadableStream({
        async start(controller) {
          for await (const part of response) {
            const text = part.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        },
      });

      return new Response(stream);
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: enhancedMessages,
        temperature: isRagMode ? 0.7 : 0.9,
        max_tokens: isRagMode ? 1000 : 500
      });

      return NextResponse.json({
        content: completion.choices[0].message.content
      });
    }
  } catch (error: any) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 