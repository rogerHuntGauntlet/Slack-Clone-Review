import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { operation, namespace, data } = await request.json();

    if (!operation || !namespace || !data) {
      return NextResponse.json(
        { error: 'Operation, namespace, and data are required' },
        { status: 400 }
      );
    }

    // Get Pinecone index
    const index = pinecone.index('agent-store');

    switch (operation) {
      case 'upsert': {
        await index.namespace(namespace).upsert(data.vectors);
        return NextResponse.json({ success: true });
      }

      case 'query': {
        const queryResponse = await index.namespace(namespace).query({
          vector: data.vector,
          topK: data.topK || 5,
          includeMetadata: true,
        });
        return NextResponse.json(queryResponse);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in Pinecone operation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform Pinecone operation' },
      { status: 500 }
    );
  }
} 