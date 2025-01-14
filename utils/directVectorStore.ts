import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import './loadEnv';

export interface Message {
    id: string;
    content: string;
    timestamp: number;
    userId: string;
    channelId: string;
}

export interface MessageMetadata extends RecordMetadata {
    content: string;
    timestamp: number;
    userId: string;
    channelId: string;
}

// Check environment variables
function checkEnvironment() {
    console.log('[Vector Store] Checking environment variables...');
    const config = {
        PINECONE_API_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
        PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ? '✓ Set' : '× Missing',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '× Missing'
    };
    
    console.log('[Vector Store] Environment configuration:', config);
    
    const missingVars = Object.entries(config)
        .filter(([_, value]) => value === '× Missing')
        .map(([key]) => key);
    
    if (missingVars.length > 0) {
        console.error('[Vector Store] Missing required environment variables:', missingVars);
        return false;
    }
    
    return true;
}

// Helper function to check if we're in a browser environment
export function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

// Helper function to check if vector store is available
export async function isVectorStoreAvailable(): Promise<boolean> {
    if (isBrowser()) {
        console.log('[Vector Store] Running in browser environment, vector store not available');
        return false;
    }
    
    if (!pinecone || !openaiClient || !vectorStore) {
        const initialized = await initializeClients();
        if (!initialized) {
            console.error('[Vector Store] Failed to initialize clients');
            return false;
        }
    }
    
    return true;
}

// Initialize Pinecone client
let pinecone: Pinecone | null = null;
let openaiClient: OpenAI | null = null;
let vectorStore: Index<MessageMetadata> | null = null;

// Initialize clients
async function initializeClients() {
    console.log('[Vector Store] Initializing clients...');
    
    try {
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
            console.error('[Vector Store] Cannot initialize in browser environment');
            return false;
        }
        
        // Check environment variables
        console.log('[Vector Store] Checking environment variables...');
        const envCheck = checkEnvironment();
        if (!envCheck) {
            console.error('[Vector Store] Environment check failed - missing required variables');
            return false;
        }
        console.log('[Vector Store] Environment check passed');
        
        try {
            if (!pinecone) {
                console.log('[Vector Store] Initializing Pinecone client...');
                console.log('[Vector Store] Using API key:', process.env.PINECONE_API_KEY?.substring(0, 5) + '...');
                pinecone = new Pinecone({
                    apiKey: process.env.PINECONE_API_KEY || ''
                });
                console.log('[Vector Store] Pinecone client initialized');
                
                // Check if index exists, create if it doesn't
                const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
                console.log('[Vector Store] Checking for index:', indexName);
                const indexes = await pinecone.listIndexes();
                console.log('[Vector Store] Current indexes:', indexes);
                
                if (!indexes.indexes?.find(idx => idx.name === indexName)) {
                    console.log('[Vector Store] Index not found, attempting to create...');
                    try {
                        await pinecone.createIndex({
                            name: indexName,
                            dimension: 1536,
                            spec: {
                                pod: {
                                    environment: process.env.PINECONE_ENVIRONMENT || 'gcp-starter',
                                    podType: 'p1.x1'
                                }
                            }
                        });
                        console.log('[Vector Store] Index created successfully');
                    } catch (createError) {
                        console.error('[Vector Store] Error creating index:', createError);
                        if (createError instanceof Error) {
                            console.error('[Vector Store] Create index error details:', {
                                message: createError.message,
                                name: createError.name,
                                stack: createError.stack
                            });
                        }
                        throw createError;
                    }
                } else {
                    console.log('[Vector Store] Index already exists');
                }
            }
            
            if (!openaiClient) {
                console.log('[Vector Store] Initializing OpenAI client...');
                console.log('[Vector Store] Using API key:', process.env.OPENAI_API_KEY?.substring(0, 5) + '...');
                openaiClient = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
                console.log('[Vector Store] OpenAI client initialized');
            }
            
            console.log('[Vector Store] All clients initialized successfully');
            return true;
        } catch (clientError) {
            console.error('[Vector Store] Error initializing clients:', clientError);
            if (clientError instanceof Error) {
                console.error('[Vector Store] Client initialization error details:', {
                    message: clientError.message,
                    name: clientError.name,
                    stack: clientError.stack
                });
            }
            return false;
        }
    } catch (error) {
        console.error('[Vector Store] Unexpected error during initialization:', error);
        if (error instanceof Error) {
            console.error('[Vector Store] Unexpected error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
        }
        return false;
    }
}

async function generateEmbedding(text: string) {
    console.log('[Vector Store] Generating embedding for text length:', text.length);
    const startTime = Date.now();
    
    if (!openaiClient) {
        const initialized = await initializeClients();
        if (!initialized || !openaiClient) {
            throw new Error('Failed to initialize OpenAI client');
        }
    }
    
    try {
        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
            encoding_format: "float"
        });
        console.log('[Vector Store] Embedding generated in', Date.now() - startTime, 'ms');
        return response.data[0].embedding;
    } catch (error) {
        console.error('[Vector Store] Error generating embedding:', error);
        if (error instanceof Error) {
            console.error('[Vector Store] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
}

export async function addMessages(messages: Message[]) {
    try {
        console.log('[Vector Store] Adding messages:', messages.length);
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // Initialize clients if needed
        if (!pinecone || !openaiClient) {
            const initialized = await initializeClients();
            if (!initialized || !pinecone || !openaiClient) {
                throw new Error('Failed to initialize clients');
            }
        }
        
        // Initialize index if not already done
        if (!vectorStore) {
            console.log('[Vector Store] Initializing vector store for message addition...');
            const indexes = await pinecone.listIndexes();
            console.log('[Vector Store] Available indexes:', indexes);
            
            const index = indexes.indexes?.find(idx => idx.name === indexName);
            if (!index) {
                console.error('[Vector Store] Index not found:', indexName);
                throw new Error(`Index ${indexName} not found`);
            }
            vectorStore = pinecone.Index<MessageMetadata>(indexName);
            console.log('[Vector Store] Vector store initialized successfully');
        }

        // Process messages in batches
        const batchSize = 5;
        let processed = 0;

        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            console.log(`[Vector Store] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}...`);
            
            // Generate embeddings for the batch
            const vectors = await Promise.all(
                batch.map(async (msg) => {
                    console.log(`[Vector Store] Generating embedding for message: ${msg.id}`);
                    const embedding = await generateEmbedding(msg.content);
                    return {
                        id: msg.id,
                        values: embedding,
                        metadata: {
                            content: msg.content,
                            timestamp: msg.timestamp,
                            userId: msg.userId,
                            channelId: msg.channelId
                        }
                    };
                })
            );

            // Upsert vectors to Pinecone
            console.log('[Vector Store] Upserting vectors to Pinecone...');
            const upsertStartTime = Date.now();
            await vectorStore.upsert(vectors);
            console.log('[Vector Store] Upsert completed in', Date.now() - upsertStartTime, 'ms');
            processed += vectors.length;
            console.log(`[Vector Store] Processed ${processed}/${messages.length} messages`);

            if (i + batchSize < messages.length) {
                console.log('[Vector Store] Waiting before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return processed;
    } catch (error) {
        console.error('[Vector Store] Error adding messages:', error);
        if (error instanceof Error) {
            console.error('[Vector Store] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
}

export async function searchMessages(query: string, limit: number = 5) {
    try {
        console.log('[Vector Store] Searching messages with query:', query);
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        
        // Initialize clients if needed
        if (!pinecone || !openaiClient) {
            const initialized = await initializeClients();
            if (!initialized || !pinecone || !openaiClient) {
                throw new Error('Failed to initialize clients');
            }
        }
        
        // Initialize index if not already done
        if (!vectorStore) {
            console.log('[Vector Store] Initializing vector store for search...');
            const indexes = await pinecone.listIndexes();
            console.log('[Vector Store] Available indexes:', indexes);
            
            const index = indexes.indexes?.find(idx => idx.name === indexName);
            if (!index) {
                console.error('[Vector Store] Index not found:', indexName);
                throw new Error(`Index ${indexName} not found`);
            }
            vectorStore = pinecone.Index<MessageMetadata>(indexName);
            console.log('[Vector Store] Vector store initialized successfully');
        }

        // Generate query embedding
        console.log('[Vector Store] Generating query embedding...');
        const startTime = Date.now();
        const queryEmbedding = await generateEmbedding(query);
        console.log('[Vector Store] Query embedding generated in', Date.now() - startTime, 'ms');
        
        // Query Pinecone
        console.log('[Vector Store] Querying Pinecone...');
        const queryStartTime = Date.now();
        const results = await vectorStore.query({
            vector: queryEmbedding,
            topK: limit,
            includeMetadata: true
        });
        console.log('[Vector Store] Query completed in', Date.now() - queryStartTime, 'ms');
        console.log('[Vector Store] Found', results.matches.length, 'matches');

        return results.matches.map(match => ({
            content: match.metadata?.content,
            score: match.score,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('[Vector Store] Error searching messages:', error);
        if (error instanceof Error) {
            console.error('[Vector Store] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            // Check for specific error types
            if (error.message.includes('API key')) {
                console.error('[Vector Store] API key error detected');
            } else if (error.message.includes('not found')) {
                console.error('[Vector Store] Index not found error detected');
            }
        }
        throw error;
    }
} 