import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pinecone } from '@pinecone-database/pinecone';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

export async function POST(request: Request) {
  try {
    const { agentId, vectors } = await request.json();

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
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

    // Store in Pinecone using agent-store index
    const index = pinecone.index('agent-store');
    await index.namespace(agent.pinecone_namespace).upsert(vectors);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in store knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 