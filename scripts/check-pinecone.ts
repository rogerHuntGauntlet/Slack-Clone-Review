import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function checkPineconeIndex() {
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || ''
    });

    try {
        // List all indexes
        console.log('Available indexes:');
        const indexes = await pinecone.listIndexes();
        console.log(indexes);

        // Get specific index
        const indexName = process.env.PHD_PINECONE_INDEX_NAME || 'phd-knowledge';
        const index = pinecone.Index(indexName);

        // Get index stats
        console.log(`\nStats for index ${indexName}:`);
        const stats = await index.describeIndexStats();
        console.log(stats);

        // Query a few vectors to verify content
        const namespace = process.env.PHD_PINECONE_NAMESPACE || 'research';
        const queryResponse = await index.namespace(namespace).query({
            topK: 3,
            includeMetadata: true,
            vector: new Array(1536).fill(0.1) // Default dimension for ada-002
        });

        console.log('\nSample vectors from the index:');
        console.log(JSON.stringify(queryResponse, null, 2));

    } catch (error) {
        console.error('Error checking Pinecone:', error);
    }
}

console.log('Environment:', {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
    PHD_PINECONE_INDEX_NAME: process.env.PHD_PINECONE_INDEX_NAME ? '✓ Set' : '× Missing'
});

checkPineconeIndex(); 