import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
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

interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        source: string;
        section?: string;
        startIndex: number;
        endIndex: number;
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

async function processDocument(filePath: string): Promise<DocumentChunk[]> {
    console.log(`Processing document: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Create text splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n## ", "\n### ", "\n#### ", "\n\n", "\n", " ", ""]
    });

    // Split text into chunks
    const chunks = await splitter.createDocuments([content]);
    
    return chunks.map((chunk, index) => ({
        id: `${path.basename(filePath)}-${index}`,
        content: chunk.pageContent,
        metadata: {
            source: path.basename(filePath),
            startIndex: chunk.metadata.start || 0,
            endIndex: chunk.metadata.end || chunk.pageContent.length,
            section: extractSection(chunk.pageContent)
        }
    }));
}

function extractSection(content: string): string {
    // Try to extract section heading from markdown
    const headingMatch = content.match(/^#+\s+(.+)$/m);
    return headingMatch ? headingMatch[1] : 'General';
}

async function vectorizeChunks(chunks: DocumentChunk[]) {
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
        // Get all markdown files from the docs directory
        const docsDir = path.resolve(__dirname, '../docs');
        const files = await fs.readdir(docsDir);
        const mdFiles = files.filter(file => file.endsWith('.md'));
        
        console.log(`Found ${mdFiles.length} markdown files`);
        
        for (const file of mdFiles) {
            const filePath = path.join(docsDir, file);
            const chunks = await processDocument(filePath);
            console.log(`Generated ${chunks.length} chunks from ${file}`);
            await vectorizeChunks(chunks);
        }
        
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