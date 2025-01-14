import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || ''
});

export async function getPineconeIndex() {
    return pinecone.index(process.env.PINECONE_INDEX_NAME || 'slack-rag');
}

export async function testConnection() {
    try {
        const indexes = await pinecone.listIndexes();
        return { success: true, indexes };
    } catch (error) {
        return { success: false, error };
    }
} 