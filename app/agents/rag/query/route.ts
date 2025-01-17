import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

interface PineconeMetadata {
  [key: string]: string | number | boolean | null;
}

const pinecone = new Pinecone();

export async function POST(request: Request) {
  try {
    const { agentId, query, namespace } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get the index
    const index = pinecone.index(process.env.PINECONE_INDEX || '');

    // Query the index
    const queryResponse = await index.query({
      vector: await getQueryEmbedding(query),
      topK: 5,
      includeMetadata: true,
      filter: { namespace }
    });

    // Format results
    const results = queryResponse.matches?.map(match => ({
      title: String(match.metadata?.title || 'Untitled'),
      url: String(match.metadata?.url || ''),
      snippet: String(match.metadata?.content || ''),
      position: match.score || 0
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-ada-002'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get embedding');
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
} 