const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
require('./loadEnv');

// Initialize Pinecone client
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || '',
    maxRetries: 5
});

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

let vectorStore = null;

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
        encoding_format: "float"
    });
    return response.data[0].embedding;
}

async function initializeVectorStore() {
    const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
    
    if (!vectorStore) {
        console.log('Initializing vector store...');
        try {
            // List all indexes
            const indexes = await pinecone.listIndexes();
            console.log('Available indexes:', indexes);
            
            const index = indexes.indexes?.find(idx => idx.name === indexName);
            if (!index) {
                throw new Error(`Index ${indexName} not found. Please create it first.`);
            }
            
            // Initialize the index
            vectorStore = pinecone.index(indexName);
            
            // Test the connection
            const stats = await vectorStore.describeIndexStats();
            console.log('Index stats:', stats);
            console.log('Vector store initialized successfully');
        } catch (error) {
            console.error('Error initializing vector store:', error);
            throw error;
        }
    }
    return vectorStore;
}

async function addMessages(messages) {
    try {
        // Ensure vector store is initialized
        const index = await initializeVectorStore();

        // Process messages in batches
        const batchSize = 5; // Very small batch size
        let processed = 0;

        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}...`);
            
            // Generate embeddings for the batch
            const vectors = await Promise.all(
                batch.map(async (msg) => {
                    console.log(`Generating embedding for message: ${msg.id}`);
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
            console.log('Upserting vectors to Pinecone...');
            try {
                // Add namespace to match documentation example
                await index.namespace('').upsert(vectors);
                processed += vectors.length;
                console.log(`Processed ${processed}/${messages.length} messages`);
            } catch (error) {
                console.error('Error upserting vectors:', error);
                throw error;
            }

            // Add a delay between batches
            if (i + batchSize < messages.length) {
                console.log('Waiting before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return processed;
    } catch (error) {
        console.error('Error adding messages:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw error;
    }
}

async function searchMessages(query, limit = 5) {
    try {
        // Ensure vector store is initialized
        const index = await initializeVectorStore();

        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query);
        
        // Query Pinecone
        try {
            // Add namespace to match documentation example
            const results = await index.namespace('').query({
                vector: queryEmbedding,
                topK: limit,
                includeMetadata: true
            });
            
            return results.matches.map(match => ({
                content: match.metadata?.content,
                score: match.score,
                metadata: match.metadata
            }));
        } catch (error) {
            console.error('Error querying vectors:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error searching messages:', error);
        throw error;
    }
}

module.exports = {
    addMessages,
    searchMessages
}; 