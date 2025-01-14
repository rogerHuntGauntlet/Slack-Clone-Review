import { Pinecone } from '@pinecone-database/pinecone';
import './loadEnv';

async function setupIndex() {
    try {
        console.log('Initializing Pinecone client...');
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ''
        });

        const indexName = 'slack-rag';

        // Delete existing index if it exists
        console.log('Checking for existing index...');
        const indexes = await pinecone.listIndexes();
        if (indexes.indexes?.some(idx => idx.name === indexName)) {
            console.log(`Deleting existing index '${indexName}'...`);
            await pinecone.deleteIndex(indexName);
            // Wait a bit for the deletion to complete
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Create new index
        console.log(`Creating new index '${indexName}'...`);
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536,
            metric: 'cosine',
            spec: {
                pod: {
                    environment: 'gcp-starter',
                    podType: 's1.x1'
                }
            }
        });

        console.log('Waiting for index to be ready...');
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isReady && attempts < maxAttempts) {
            attempts++;
            try {
                const description = await pinecone.describeIndex(indexName);
                isReady = description.status.ready;
                if (!isReady) {
                    console.log(`Index not ready yet (attempt ${attempts}/${maxAttempts}), waiting 10 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            } catch (error) {
                console.log(`Error checking index status (attempt ${attempts}/${maxAttempts}):`, error);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        if (isReady) {
            console.log('Index is ready!');
        } else {
            throw new Error('Index failed to become ready after maximum attempts');
        }
    } catch (error) {
        console.error('Error setting up index:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupIndex();
} 