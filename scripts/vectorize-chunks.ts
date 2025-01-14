import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize clients
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

interface PreprocessedChunk {
    id: string;
    content: string;
    metadata: {
        source: string;
        section?: string;
        context?: string;
        summary?: string;
        [key: string]: any;
    };
}

async function generateEmbedding(text: string) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float"
    });
    return response.data[0].embedding;
}

async function vectorizeChunks(chunks: PreprocessedChunk[]) {
    const indexName = process.env.PHD_PINECONE_INDEX_NAME || 'phd-knowledge';
    const namespace = process.env.PHD_PINECONE_NAMESPACE || 'research';
    
    const index = pinecone.Index(indexName);
    
    // Process chunks in batches
    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}...`);
        
        // Generate embeddings for the batch
        const vectors = await Promise.all(
            batch.map(async (chunk) => {
                const embedding = await generateEmbedding(chunk.content);
                return {
                    id: chunk.id,
                    values: embedding,
                    metadata: {
                        content: chunk.content,
                        ...chunk.metadata
                    }
                };
            })
        );
        
        // Upsert vectors to Pinecone
        await index.namespace(namespace).upsert(vectors);
        processed += vectors.length;
        console.log(`Processed ${processed}/${chunks.length} chunks`);
        
        // Add a delay between batches
        if (i + batchSize < chunks.length) {
            console.log('Waiting before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function main() {
    try {
        // Read the preprocessed chunks from the JSON file
        const chunksPath = path.resolve(__dirname, '../docs/chunks.json');
        const chunksData = await fs.readFile(chunksPath, 'utf-8');
        const chunks: PreprocessedChunk[] = JSON.parse(chunksData);
        
        console.log(`Found ${chunks.length} preprocessed chunks`);
        await vectorizeChunks(chunks);
        console.log('Vectorization complete!');
        
    } catch (error) {
        console.error('Error during vectorization:', error);
        process.exit(1);
    }
}

// Run the script
console.log('Environment:', {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '× Missing',
    PHD_PINECONE_INDEX_NAME: process.env.PHD_PINECONE_INDEX_NAME ? '✓ Set' : '× Missing'
});

main(); 