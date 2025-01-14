import './loadEnv';
import { addMessages, searchMessages, Message } from './directVectorStore';

async function testDirectVectorStore() {
    const testMessages: Message[] = [
        {
            id: '1',
            content: 'The quick brown fox jumps over the lazy dog',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        }
    ];

    try {
        // Test adding a message
        console.log('Testing message addition...');
        const processed = await addMessages(testMessages);
        console.log(`Successfully processed ${processed} messages`);

        // Wait a moment for indexing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test searching
        console.log('\nTesting search...');
        const query = 'fox jumps';
        const results = await searchMessages(query, 1);
        
        console.log('\nSearch Results:');
        results.forEach((result, i) => {
            console.log(`\n${i + 1}. Content: ${result.content}`);
            console.log(`   Score: ${result.score}`);
        });

    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    testDirectVectorStore();
} 