import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AgentChatService } from '@/app/agents/services/agent-chat-service';

// Store chat services in memory (in production, consider using Redis)
const chatServices = new Map<string, AgentChatService>();

export async function POST(request: Request) {
  try {
    console.log('1. API endpoint called: /api/agents/chat');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('2. Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('2. User authenticated:', { userId: user.id });
    const body = await request.json();
    const { agentId, message } = body;
    console.log('3. Request body:', { agentId, message });

    if (!agentId || !message) {
      console.log('4. Missing required parameters');
      return NextResponse.json(
        { error: 'Agent ID and message are required' },
        { status: 400 }
      );
    }

    // Get or create chat service for this agent
    let chatService = chatServices.get(agentId);
    if (!chatService) {
      console.log('5. Creating new chat service for agent:', agentId);
      // Verify agent exists and belongs to user
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, name, pinecone_index')
        .eq('id', agentId)
        .eq('user_id', user.id)
        .single();

      if (agentError || !agent) {
        console.log('6. Agent verification failed:', { error: agentError });
        return NextResponse.json(
          { error: 'Agent not found or access denied' },
          { status: 404 }
        );
      }

      console.log('6. Agent verified:', agent);
      chatService = new AgentChatService(agentId);
      chatServices.set(agentId, chatService);
    } else {
      console.log('5. Using existing chat service for agent:', agentId);
    }

    console.log('7. Setting up response stream');
    // Create a TransformStream for streaming the response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process message with streaming
    console.log('8. Starting chat processing');
    chatService.chat(message, async (token: string) => {
      console.log('Streaming token:', token);
      await writer.write(encoder.encode(token));
    }).then(async () => {
      console.log('9. Chat processing complete');
      await writer.close();
    }).catch(async (error: Error) => {
      console.error('10. Error in chat processing:', error);
      await writer.write(encoder.encode(`Error: ${error.message}`));
      await writer.close();
    });

    console.log('11. Returning streaming response');
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Error in POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 