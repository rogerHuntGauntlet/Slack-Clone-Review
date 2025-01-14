import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function initializePineconeIndex() {
    console.log('Starting Pinecone index initialization...');
    
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || ''
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';

    try {
        // List all indexes
        const indexes = await pinecone.listIndexes();
        const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);

        if (existingIndex) {
            console.log(`Index ${indexName} already exists`);
            return;
        }

        // Create the index if it doesn't exist
        console.log(`Creating index ${indexName}...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536, // OpenAI ada-002 embedding dimension
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: process.env.PINECONE_ENVIRONMENT === 'gcp-starter' ? 'gcp' : 'aws',
                    region: process.env.PINECONE_ENVIRONMENT === 'gcp-starter' ? 'us-central1' : 'us-west-2'
                }
            }
        });

        console.log('Waiting for index to be ready...');
        // Wait for the index to be ready
        let isReady = false;
        while (!isReady) {
            const description = await pinecone.describeIndex(indexName);
            isReady = description.status.ready;
            if (!isReady) {
                console.log('Index not ready yet, waiting 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        console.log('Index is ready!');
        
    } catch (error) {
        console.error('Error initializing Pinecone index:', error);
        process.exit(1);
    }
}

// Run the initialization
console.log('Environment:', {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ? '✓ Set' : '× Missing',
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT ? '✓ Set' : '× Missing'
});

initializePineconeIndex(); 