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
        title?: string;
        context?: string;
        summary?: string;
        type?: string;
        authors?: string[];
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

async function processDocument(filePath: string): Promise<DocumentChunk[]> {
    console.log(`Reading file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`File content length: ${content.length} characters`);
    const fileName = path.basename(filePath);
    
    // Create text splitter optimized for academic content
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 200,
        separators: ["\n## ", "\n# ", "\n### ", "\n\n", "\n", " ", ""],
        lengthFunction: (text) => text.length
    });

    // Split text into chunks
    console.log('Splitting text into chunks...');
    const rawChunks = await splitter.createDocuments([content]);
    console.log(`Created ${rawChunks.length} raw chunks`);

    // Process chunks with metadata
    const documentChunks: DocumentChunk[] = rawChunks.map((chunk, index) => {
        // Extract section title if present
        const sectionMatch = chunk.pageContent.match(/^(?:#{1,3})\s+([^\n]+)/m);
        const section = sectionMatch ? sectionMatch[1] : undefined;

        // Determine document type and context
        const type = fileName.includes('prop') ? 'proposal' :
                    fileName.includes('paper') ? 'paper' :
                    fileName.includes('appendix') ? 'appendix' :
                    fileName.includes('bio') ? 'biography' : 'document';

        const chunkObj = {
            id: `${fileName}-${index}`,
            content: chunk.pageContent.trim(),
            metadata: {
                source: fileName,
                section,
                type,
                context: getContext(chunk.pageContent),
                summary: getSummary(chunk.pageContent)
            }
        };
        
        console.log(`Processed chunk ${index + 1}/${rawChunks.length} from ${fileName}`);
        console.log(`  - Length: ${chunkObj.content.length} chars`);
        console.log(`  - Section: ${section || 'N/A'}`);
        
        return chunkObj;
    });

    return documentChunks;
}

function getContext(text: string): string {
    // Extract meaningful context from the chunk
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    
    // Try to get context from headers or first paragraph
    const headerMatch = text.match(/^(?:#{1,3})\s+([^\n]+)/m);
    if (headerMatch) return headerMatch[1];
    
    // Otherwise return first line or truncated content
    return lines[0].length > 100 ? lines[0].substring(0, 100) + '...' : lines[0];
}

function getSummary(text: string): string {
    // Create a brief summary of the chunk content
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    
    // If there's a header, use the first paragraph after it
    const headerIndex = lines.findIndex(line => line.match(/^#{1,3}\s+/));
    if (headerIndex !== -1 && lines[headerIndex + 1]) {
        return lines[headerIndex + 1];
    }
    
    // Otherwise use first paragraph
    return lines[0];
}

async function vectorizeChunks(chunks: DocumentChunk[]) {
    const indexName = process.env.PHD_PINECONE_INDEX_NAME || 'phd-knowledge';
    const namespace = process.env.PHD_PINECONE_NAMESPACE || 'research';
    
    console.log(`Using Pinecone index: ${indexName}, namespace: ${namespace}`);
    console.log(`Total chunks to process: ${chunks.length}`);
    
    const index = pinecone.Index(indexName);
    
    // Process chunks in batches
    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}...`);
        
        try {
            // Generate embeddings for the batch
            console.log('Generating embeddings...');
            const vectors = await Promise.all(
                batch.map(async (chunk) => {
                    try {
                        const embedding = await generateEmbedding(chunk.content);
                        return {
                            id: chunk.id,
                            values: embedding,
                            metadata: {
                                content: chunk.content,
                                ...chunk.metadata
                            }
                        };
                    } catch (error) {
                        console.error(`Error generating embedding for chunk ${chunk.id}:`, error);
                        throw error;
                    }
                })
            );
            
            // Upsert vectors to Pinecone
            console.log(`Upserting ${vectors.length} vectors to Pinecone...`);
            const upsertResponse = await index.namespace(namespace).upsert(vectors);
            console.log('Upsert response:', upsertResponse);
            
            processed += vectors.length;
            console.log(`Successfully processed ${processed}/${chunks.length} chunks`);
        } catch (error) {
            console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, error);
            throw error;
        }
        
        // Add a delay between batches
        if (i + batchSize < chunks.length) {
            console.log('Waiting 2 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function main() {
    try {
        console.log('Starting document processing...');
        const docsDir = path.resolve(__dirname, '../phd-rag-mds');
        
        // Check if directory exists
        try {
            await fs.access(docsDir);
        } catch (error) {
            console.error(`Directory ${docsDir} does not exist!`);
            process.exit(1);
        }
        
        const files = await fs.readdir(docsDir);
        console.log(`Found ${files.length} files in ${docsDir}`);
        
        let allChunks: DocumentChunk[] = [];
        
        // Process each markdown file
        for (const file of files) {
            if (file.endsWith('.md') || file === 'md-bio') {
                console.log(`\nProcessing ${file}...`);
                const filePath = path.join(docsDir, file);
                try {
                    const chunks = await processDocument(filePath);
                    console.log(`Generated ${chunks.length} chunks from ${file}`);
                    allChunks = allChunks.concat(chunks);
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    throw error;
                }
            }
        }
        
        console.log(`\nTotal chunks generated: ${allChunks.length}`);
        
        // Save chunks to file for reference
        const chunksPath = path.resolve(__dirname, '../docs/chunks.json');
        await fs.mkdir(path.dirname(chunksPath), { recursive: true });
        await fs.writeFile(chunksPath, JSON.stringify(allChunks, null, 2));
        console.log(`Saved chunks to ${chunksPath}`);
        
        // Vectorize and store chunks
        console.log('\nStarting vectorization process...');
        await vectorizeChunks(allChunks);
        console.log('\nVectorization complete!');
        
    } catch (error) {
        console.error('\nError during processing:', error);
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