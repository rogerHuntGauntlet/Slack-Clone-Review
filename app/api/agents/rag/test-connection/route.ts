import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';

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
    const { namespace, indexName } = await request.json();

    if (!namespace || !indexName) {
      return NextResponse.json(
        { error: 'Namespace and index name are required' },
        { status: 400 }
      );
    }

    // Test connection by querying the namespace
    const index = pinecone.index(indexName);
    const testQuery = await index.namespace(namespace).query({
      vector: Array(1536).fill(0), // Empty vector for testing
      topK: 1,
      includeMetadata: true
    });

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      stats: {
        matches: testQuery.matches?.length || 0
      }
    });
  } catch (error: any) {
    console.error('RAG connection test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test RAG connection' },
      { status: 500 }
    );
  }
} 