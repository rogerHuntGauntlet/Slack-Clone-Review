import type { Message } from './embeddings';
import { generateEmbedding, searchMessages } from './embeddings';
import { Pinecone } from '@pinecone-database/pinecone';

export type { Message };
export { generateEmbedding, searchMessages };

// Track initialization status
let isInitialized = false;
let isAvailable = false;
let pineconeClient: Pinecone | null = null;

export async function addMessages(messages: Message[]) {
    // This function should be moved to a server-side API endpoint
    throw new Error('This function must be called from a server-side context');
}

export async function initVectorStore() {
    console.log('[Vector Store] Starting initialization...');
    
    // Only attempt initialization on the server side
    if (typeof window !== 'undefined') {
        console.log('[Vector Store] Running in browser, skipping initialization');
        isInitialized = true;
        isAvailable = false;
        return null;
    }

    try {
        console.log('[Vector Store] Checking environment variables...');
        const pineconeApiKey = process.env.PINECONE_API_KEY;
        const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (!pineconeApiKey) throw new Error('PINECONE_API_KEY is not set');
        if (!pineconeIndexName) throw new Error('PINECONE_INDEX_NAME is not set');
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY is not set');

        console.log('[Vector Store] Environment variables verified');
        
        // Initialize Pinecone client
        if (!pineconeClient) {
            console.log('[Vector Store] Initializing Pinecone client...');
            pineconeClient = new Pinecone({
                apiKey: pineconeApiKey
            });
            console.log('[Vector Store] Pinecone client initialized');
        }

        isAvailable = true;
        console.log('[Vector Store] Initialization successful');
        return pineconeClient.index(pineconeIndexName);
    } catch (error) {
        console.error('[Vector Store] Failed to initialize:', error);
        isAvailable = false;
        throw error;
    } finally {
        isInitialized = true;
        console.log('[Vector Store] Final status:', { isInitialized, isAvailable });
    }
}

export async function checkVectorStoreAvailability(): Promise<boolean> {
    console.log('[Vector Store] Checking availability...');
    if (!isInitialized) {
        console.log('[Vector Store] Not initialized, initializing now...');
        await initVectorStore();
    }
    console.log('[Vector Store] Status:', { isInitialized, isAvailable });
    return isAvailable;
}

export function getPineconeClient(): Pinecone | null {
    return pineconeClient;
}

export async function checkIndexContents() {
    const client = getPineconeClient();
    if (!client) throw new Error('Pinecone client not initialized');
    
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) throw new Error('PINECONE_INDEX_NAME not set');
    
    const index = client.index(indexName);
    const stats = await index.describeIndexStats();
    return stats;
} 