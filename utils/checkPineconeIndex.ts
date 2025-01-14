import { Pinecone } from '@pinecone-database/pinecone';
import './loadEnv';

async function checkIndex() {
    try {
        console.log('Initializing Pinecone client...');
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ''
        });

        console.log('\nListing all indexes...');
        const indexes = await pinecone.listIndexes();
        console.log('Available indexes:', indexes);

        const indexName = 'slack-rag';
        console.log(`\nChecking details for index '${indexName}'...`);
        try {
            const description = await pinecone.describeIndex(indexName);
            console.log('Index details:', JSON.stringify(description, null, 2));
        } catch (error) {
            console.log(`Index '${indexName}' not found or not accessible`);
        }
    } catch (error) {
        console.error('Error checking Pinecone:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    checkIndex();
} 