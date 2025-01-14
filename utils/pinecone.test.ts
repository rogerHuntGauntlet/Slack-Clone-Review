import './loadEnv';
import { testConnection, getPineconeIndex } from './pinecone';

async function testPineconeConnection() {
    try {
        console.log('Testing Pinecone connection...');
        const connectionTest = await testConnection();
        
        if (!connectionTest.success) {
            throw connectionTest.error;
        }
        
        console.log('Available indexes:', connectionTest.indexes);

        const index = await getPineconeIndex();
        console.log('Successfully connected to index:', index.namespace('default'));

        console.log('Pinecone connection test successful!');
    } catch (error) {
        console.error('Pinecone connection test failed:', error);
        throw error;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testPineconeConnection();
} 