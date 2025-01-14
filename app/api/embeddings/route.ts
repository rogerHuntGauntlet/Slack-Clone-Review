import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text: string) {
    console.log('[OpenAI] Generating embedding for text length:', text.length);
    const startTime = Date.now();
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
            encoding_format: "float"
        });
        console.log('[OpenAI] Embedding generated successfully in', Date.now() - startTime, 'ms');
        return response.data[0].embedding;
    } catch (error) {
        console.error('[OpenAI] Error generating embedding:', error);
        if (error instanceof Error) {
            console.error('[OpenAI] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        console.log('[Embeddings API] Processing request...');
        const { text, operation } = await request.json();
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        console.log('[Embeddings API] Operation:', operation);
        
        // Get or initialize the index
        console.log('[Pinecone] Listing indexes...');
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            console.error('[Pinecone] Index not found:', indexName);
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }

        console.log('[Pinecone] Using index:', indexName);
        const vectorStore = pinecone.Index(indexName);
        
        switch (operation) {
            case 'embed': {
                console.log('[Embeddings API] Generating embedding...');
                const embedding = await generateEmbedding(text);
                console.log('[Embeddings API] Embedding generated successfully');
                return NextResponse.json({ success: true, embedding });
            }
            
            case 'search': {
                console.log('[Embeddings API] Performing vector search...');
                const startTime = Date.now();
                const embedding = await generateEmbedding(text);
                
                console.log('[Pinecone] Querying vector store...');
                const results = await vectorStore.query({
                    vector: embedding,
                    topK: 5,
                    includeMetadata: true
                });
                
                console.log('[Embeddings API] Search completed in', Date.now() - startTime, 'ms');
                console.log('[Embeddings API] Found', results.matches.length, 'matches');
                
                return NextResponse.json({ success: true, results: results.matches });
            }
            
            default:
                console.error('[Embeddings API] Invalid operation:', operation);
                return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
        }
    } catch (error) {
        console.error('[Embeddings API] Error processing request:', error);
        if (error instanceof Error) {
            console.error('[Embeddings API] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 