import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function initVectorStore() {
    console.log('Initializing vector store...');
    
    try {
        // Initialize Pinecone client
        console.log('Initializing Pinecone client...');
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ''
        });
        
        // Check if index exists
        const indexName = process.env.PINECONE_INDEX_NAME || 'slack-rag';
        console.log('Checking for index:', indexName);
        const indexes = await pinecone.listIndexes();
        
        if (!indexes.indexes?.find(idx => idx.name === indexName)) {
            console.log('Index not found, creating...');
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
            console.log('Index created successfully');
        } else {
            console.log('Index already exists');
        }
        
        // Initialize OpenAI client
        console.log('Initializing OpenAI client...');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Add test messages
        console.log('Adding test messages...');
        const testMessages = [
            {
                id: 'test1',
                content: 'Hello, this is a test message about project planning.',
                timestamp: Date.now(),
                userId: 'test-user-1',
                channelId: 'test-channel-1',
                workspaceId: 'test-workspace-1'
            },
            {
                id: 'test2',
                content: 'We should schedule a meeting to discuss the new features.',
                timestamp: Date.now(),
                userId: 'test-user-2',
                channelId: 'test-channel-1',
                workspaceId: 'test-workspace-1'
            },
            {
                id: 'test3',
                content: 'The deployment was successful, all tests are passing.',
                timestamp: Date.now(),
                userId: 'test-user-1',
                channelId: 'test-channel-2',
                workspaceId: 'test-workspace-1'
            }
        ];
        
        const vectorStore = pinecone.Index(indexName);
        
        // Process messages
        for (const msg of testMessages) {
            console.log(`Processing message: ${msg.id}`);
            const embedding = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: msg.content,
                encoding_format: "float"
            });
            
            await vectorStore.upsert([{
                id: msg.id,
                values: embedding.data[0].embedding,
                metadata: {
                    content: msg.content,
                    timestamp: msg.timestamp,
                    userId: msg.userId,
                    channelId: msg.channelId,
                    workspaceId: msg.workspaceId
                }
            }]);
            console.log(`Message ${msg.id} added successfully`);
        }
        
        console.log('Vector store initialization completed successfully');
        
        // Check index stats
        const stats = await vectorStore.describeIndexStats();
        console.log('Index statistics:', stats);
        
    } catch (error) {
        console.error('Error initializing vector store:', error);
        process.exit(1);
    }
}

// Run the initialization
initVectorStore(); 