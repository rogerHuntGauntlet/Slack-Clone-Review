import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, namespace, data } = await request.json();

    if (!operation || !namespace || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const index = pinecone.index('web-search-store');

    switch (operation) {
      case 'upsert': {
        const { vectors } = data;
        await index.upsert({
          vectors,
          namespace
        });
        return NextResponse.json({ success: true });
      }

      case 'query': {
        const { vector, topK } = data;
        const results = await index.query({
          vector,
          topK,
          includeMetadata: true,
          namespace
        });
        return NextResponse.json(results);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in Pinecone operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 