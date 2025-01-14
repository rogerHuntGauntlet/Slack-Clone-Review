import { Pinecone } from '@pinecone-database/pinecone';
import { NextResponse } from 'next/server';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

export async function GET() {
    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // List all indexes
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }
        
        // Get index stats
        const vectorStore = pinecone.Index(indexName);
        const stats = await vectorStore.describeIndexStats();
        
        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting index stats:', error);
        return NextResponse.json({ error: 'Failed to get index stats' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // Check if index exists
        const indexes = await pinecone.listIndexes();
        let index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            // Create new index
            await pinecone.createIndex({
                name: indexName,
                dimension: 1536,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-west-2'
                    }
                }
            });
            
            // Wait for index to be ready
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            // Get the created index
            const updatedIndexes = await pinecone.listIndexes();
            index = updatedIndexes.indexes?.find(idx => idx.name === indexName);
            
            if (!index) {
                return NextResponse.json({ error: 'Failed to create index' }, { status: 500 });
            }
        }
        
        return NextResponse.json({ success: true, index });
    } catch (error) {
        console.error('Error creating/initializing index:', error);
        return NextResponse.json({ error: 'Failed to create/initialize index' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // Check if index exists
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }
        
        // Delete the index
        await pinecone.deleteIndex(indexName);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting index:', error);
        return NextResponse.json({ error: 'Failed to delete index' }, { status: 500 });
    }
} 