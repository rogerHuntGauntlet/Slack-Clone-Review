import './loadEnv';
import { addMessages, similaritySearch, Message } from './vectorStore';

async function testVectorStore() {
    const testMessages: Message[] = [
        {
            id: '1',
            content: 'The quick brown fox jumps over the lazy dog',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        },
        {
            id: '2',
            content: 'Machine learning and artificial intelligence are transforming technology',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        },
        {
            id: '3',
            content: 'Vector databases are essential for semantic search applications',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        }
    ];

    try {
        console.log('Testing vector store...');
        console.log(`Adding ${testMessages.length} messages`);
        
        const processedCount = await addMessages(testMessages);
        console.log(`Successfully added ${processedCount} messages`);

        // Test similarity search
        console.log('\nTesting similarity search...');
        const query = 'Tell me about AI and ML';
        const results = await similaritySearch(query, 2);
        
        console.log(`\nSearch query: "${query}"`);
        console.log('Search results:');
        results.forEach((result, i) => {
            console.log(`\n${i + 1}. Content: ${result.pageContent}`);
            console.log(`   Metadata:`, result.metadata);
        });

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testVectorStore();
} 