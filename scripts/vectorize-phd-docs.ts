import { initVectorStore, checkVectorStoreAvailability } from '@/utils/vectorStore';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { phdAgentConfig } from '../lib/agents/phd-agent-config';
import { Pinecone } from '@pinecone-database/pinecone';

// Function to recursively walk through directory
async function* walkDirectory(dir: string): AsyncGenerator<string> {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            yield* walkDirectory(filePath);
        } else if (stats.isFile()) {
            // Only process markdown files
            const ext = path.extname(file).toLowerCase();
            if (['.md'].includes(ext)) {
                yield filePath;
            }
        }
    }
}

// Function to chunk file content
async function chunkFile(content: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: phdAgentConfig.rag_settings.chunk_size,
        chunkOverlap: phdAgentConfig.rag_settings.chunk_overlap,
    });
    
    return await splitter.splitText(content);
}

async function main() {
    try {
        console.log('Starting PhD document vectorization...');
        
        // Initialize vector store
        await initVectorStore();
        const isAvailable = await checkVectorStoreAvailability();
        if (!isAvailable) {
            throw new Error('Vector store is not available');
        }

        // Get the Pinecone index
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ''
        });
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        const vectorStore = pinecone.Index(indexName);

        const embeddings = new OpenAIEmbeddings();
        const docsDir = path.join(process.cwd(), 'phd-rag-mds');
        let totalChunks = 0;

        // Process each file
        for await (const filePath of walkDirectory(docsDir)) {
            console.log(`\nProcessing file: ${filePath}`);
            
            // Read file content
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Split into chunks
            const chunks = await chunkFile(content);
            console.log(`Generated ${chunks.length} chunks`);
            
            // Process chunks in batches
            const batchSize = 5;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}...`);
                
                // Generate embeddings for the batch
                const vectors = await Promise.all(
                    batch.map(async (chunk) => {
                        const embedding = await embeddings.embedQuery(chunk);
                        return {
                            id: uuidv4(),
                            values: embedding,
                            metadata: {
                                content: chunk,
                                source: path.relative(docsDir, filePath),
                                timestamp: Date.now()
                            }
                        };
                    })
                );

                // Add vectors to store
                await vectorStore.upsert(vectors);
                totalChunks += batch.length;
                
                // Add a delay between batches
                if (i + batchSize < chunks.length) {
                    console.log('Waiting before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        console.log(`\nVectorization complete! Processed ${totalChunks} total chunks.`);
    } catch (error) {
        console.error('Error during vectorization:', error);
        process.exit(1);
    }
}

main(); 