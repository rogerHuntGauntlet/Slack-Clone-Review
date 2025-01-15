import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AgentChatService } from '../../services/agent-chat-service';

// Store chat services in memory (in production, consider using Redis)
const chatServices = new Map<string, AgentChatService>();

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, message } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Agent ID and message are required' },
        { status: 400 }
      );
    }

    // Get or create chat service for this agent
    let chatService = chatServices.get(agentId);
    if (!chatService) {
      // Verify agent exists and belongs to user
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, name, pinecone_index')
        .eq('id', agentId)
        .eq('user_id', user.id)
        .single();

      if (agentError || !agent) {
        return NextResponse.json(
          { error: 'Agent not found or access denied' },
          { status: 404 }
        );
      }

      chatService = new AgentChatService(agentId);
      chatServices.set(agentId, chatService);
    }

    // Process message
    const response = await chatService.chat(message);
    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('Error in agent chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

// Optional: Clear chat context
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const chatService = chatServices.get(agentId);
    if (chatService) {
      chatService.clearContext();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Chat session not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error clearing chat context:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat context' },
      { status: 500 }
    );
  }
} 