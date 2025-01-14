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
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float"
    });
    return response.data[0].embedding;
}

export async function POST(request: Request) {
    try {
        const { messages } = await request.json();
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // Get or initialize the index
        const indexes = await pinecone.listIndexes();
        const index = indexes.indexes?.find(idx => idx.name === indexName);
        
        if (!index) {
            return NextResponse.json({ error: `Index ${indexName} not found` }, { status: 404 });
        }

        const vectorStore = pinecone.Index(indexName);
        let processed = 0;
        
        // Process messages in batches
        const batchSize = 10;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            
            // Generate embeddings for the batch
            const vectors = await Promise.all(
                batch.map(async (msg: any) => {
                    const embedding = await generateEmbedding(msg.content);
                    return {
                        id: msg.id,
                        values: embedding,
                        metadata: {
                            content: msg.content,
                            timestamp: msg.timestamp,
                            userId: msg.userId,
                            channelId: msg.channelId,
                            workspaceId: msg.workspaceId
                        }
                    };
                })
            );
            
            // Upsert vectors to Pinecone
            await vectorStore.upsert(vectors);
            processed += vectors.length;
            
            // Add a small delay between batches
            if (i + batchSize < messages.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return NextResponse.json({ success: true, processed });
    } catch (error) {
        console.error('Error adding messages:', error);
        return NextResponse.json({ error: 'Failed to add messages' }, { status: 500 });
    }
} 