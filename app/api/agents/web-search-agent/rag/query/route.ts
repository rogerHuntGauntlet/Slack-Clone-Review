import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

const pinecone = new Pinecone();
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
    const { agentId, query } = await request.json();

    if (!agentId || !query) {
      return NextResponse.json(
        { error: 'Agent ID and query are required' },
        { status: 400 }
      );
    }

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, description, pinecone_namespace')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!agent.pinecone_namespace) {
      return NextResponse.json(
        { error: 'Agent does not have RAG enabled' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });

    // Query Pinecone
    const index = pinecone.index('agent-store');
    const queryResponse = await index.namespace(agent.pinecone_namespace).query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });

    // Format results
    const results = queryResponse.matches?.map(match => ({
      content: match.metadata?.content || '',
      fileName: match.metadata?.fileName || 'unknown',
      score: match.score || 0,
    })) || [];

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Error in RAG query:', error);
    return NextResponse.json(
      { error: 'Failed to process RAG query' },
      { status: 500 }
    );
  }
} 