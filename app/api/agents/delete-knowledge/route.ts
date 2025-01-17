import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const pinecone = new Pinecone();

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, pinecone_namespace')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Delete from Pinecone using agent-store index
    const index = pinecone.index('agent-store');
    await index.namespace(agent.pinecone_namespace).deleteAll();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete knowledge' },
      { status: 500 }
    );
  }
} 