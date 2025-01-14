import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

export async function getPineconeIndex() {
    console.log('[Pinecone] Initializing index with name:', process.env.PINECONE_INDEX_NAME);
    return pinecone.index(process.env.PINECONE_INDEX_NAME || 'slack-rag');
}

export async function testConnection() {
    try {
        console.log('[Pinecone] Testing connection...');
        const indexes = await pinecone.listIndexes();
        console.log('[Pinecone] Connection successful. Available indexes:', indexes);
        return { success: true, indexes };
    } catch (error) {
        console.error('[Pinecone] Connection test failed:', error);
        if (error instanceof Error) {
            console.error('[Pinecone] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        return { success: false, error };
    }
}

// Add a function to check environment variables
export function checkPineconeConfig() {
    const config = {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ? '✓ Set' : '× Missing',
        PHD_PINECONE_INDEX_NAME: process.env.PHD_PINECONE_INDEX_NAME ? '✓ Set' : '× Missing'
    };
    
    console.log('[Pinecone] Environment configuration:', config);
    return config;
} 