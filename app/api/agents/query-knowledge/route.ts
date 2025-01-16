import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

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
    const { agentId, query, topK = 5 } = await request.json();

    if (!agentId || !query) {
      return NextResponse.json(
        { error: 'Agent ID and query are required' },
        { status: 400 }
      );
    }

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or access denied' },
        { status: 404 }
      );
    }

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || '');
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { agentId: { $eq: agentId } },
      includeMetadata: true
    });

    // Format results
    const matches = results.matches
      .filter(match => match.metadata)
      .map(match => ({
        score: match.score || 0,
        content: match.metadata!.content as string,
        fileName: match.metadata!.fileName as string
      }));

    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error('Error in query knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query knowledge' },
      { status: 500 }
    );
  }
} 