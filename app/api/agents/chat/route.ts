import { OpenAI } from 'openai';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { agentId, message, stream } = await request.json();
    const supabase = createClient({ cookies });

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if agent has Pinecone set up
    if (agent.pinecone_namespace) {
      // If Pinecone is set up, return error as this endpoint is for direct chat only
      return NextResponse.json(
        { error: 'Agent has RAG enabled, use the RAG endpoint' },
        { status: 400 }
      );
    }

    // Create system message using agent description
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an AI agent named ${agent.name}. ${agent.description || ''}
      
Your goal is to help users by engaging in natural conversation while staying true to your description and purpose.
Please be helpful, friendly, and concise in your responses.

Remember:
- Stay in character as defined by your description
- Be direct and to the point
- If you're unsure about something, admit it
- Don't make up information
- Keep responses focused and relevant`
      },
      {
        role: 'user',
        content: message
      }
    ];

    if (stream) {
      // Create a transform stream to handle the response
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let responseStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk);
          // Send as SSE
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
        }
      });

      // Start the OpenAI stream
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: true,
      });

      // Create a readable stream from the completion
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let fullMessage = '';

          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullMessage += content;
                // Send each piece of content as an SSE message
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }

            // Store the complete message in the database
            await supabase
              .from('agent_chat_messages')
              .insert([
                {
                  agent_id: agentId,
                  content: message,
                  role: 'user',
                  timestamp: new Date().toISOString()
                },
                {
                  agent_id: agentId,
                  content: fullMessage,
                  role: 'agent',
                  timestamp: new Date().toISOString()
                }
              ]);

            // Send end message
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    // Store the message and response in the database
    const { error: chatError } = await supabase
      .from('agent_chat_messages')
      .insert([
        {
          agent_id: agentId,
          content: message,
          role: 'user',
          timestamp: new Date().toISOString()
        },
        {
          agent_id: agentId,
          content: response,
          role: 'agent',
          timestamp: new Date().toISOString()
        }
      ]);

    if (chatError) {
      console.error('Error storing chat messages:', chatError);
    }

    return NextResponse.json({ message: response });

  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
} 