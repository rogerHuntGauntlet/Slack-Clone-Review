import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    try {
        console.log('Starting PhD index initialization...');

        // Check environment variables
        const pineconeApiKey = process.env.PINECONE_API_KEY;
        const phdIndexName = process.env.PHD_PINECONE_INDEX_NAME;

        if (!pineconeApiKey) {
            throw new Error('PINECONE_API_KEY is not set');
        }
        if (!phdIndexName) {
            throw new Error('PHD_PINECONE_INDEX_NAME is not set');
        }

        console.log('Environment variables verified');

        // Initialize Pinecone client
        console.log('Initializing Pinecone client...');
        const pinecone = new Pinecone({
            apiKey: pineconeApiKey
        });

        // List existing indexes
        console.log('Checking existing indexes...');
        const indexes = await pinecone.listIndexes();
        const existingIndex = indexes.indexes?.find(idx => idx.name === phdIndexName);

        if (existingIndex) {
            console.log(`Index ${phdIndexName} already exists`);
            console.log('Index details:', existingIndex);
            return;
        }

        // Create new index
        console.log(`Creating new index: ${phdIndexName}`);
        await pinecone.createIndex({
            name: phdIndexName,
            dimension: 1536, // OpenAI embeddings dimension
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-west-2'
                }
            }
        });

        console.log('Waiting for index to be ready...');
        let isReady = false;
        while (!isReady) {
            const indexDescription = await pinecone.describeIndex(phdIndexName);
            isReady = indexDescription.status.ready;
            if (!isReady) {
                console.log('Index not ready yet, waiting 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        console.log('Index is ready!');
        console.log('PhD index initialization complete!');
    } catch (error) {
        console.error('Error initializing PhD index:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        process.exit(1);
    }
}

main(); 