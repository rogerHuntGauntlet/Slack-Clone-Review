import { Pinecone } from '@pinecone-database/pinecone';
import { NextResponse } from 'next/server';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

export async function GET() {
    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }

        const vectorStore = pinecone.Index(indexName);
        const stats = await vectorStore.describeIndexStats();
        
        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('Error accessing Pinecone:', error);
        return NextResponse.json({ error: 'Failed to access Pinecone' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { query, limit = 5 } = await request.json();
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }

        const vectorStore = pinecone.Index(indexName);
        
        // Query Pinecone
        const results = await vectorStore.query({
            vector: query,
            topK: limit,
            includeMetadata: true
        });

        return NextResponse.json({ success: true, results: results.matches });
    } catch (error) {
        console.error('Error querying Pinecone:', error);
        return NextResponse.json({ error: 'Failed to query Pinecone' }, { status: 500 });
    }
} 