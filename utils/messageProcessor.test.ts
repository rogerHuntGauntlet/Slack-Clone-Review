import './loadEnv';
import { processBatch } from './batchProcessor';
import { Message } from './embeddings';

async function testMessageProcessing() {
    const testMessages: Message[] = [
        {
            id: '1',
            content: 'Hello, this is a test message',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        },
        {
            id: '2',
            content: 'Another test message with different content',
            timestamp: Date.now(),
            userId: 'test-user',
            channelId: 'test-channel'
        }
    ];

    try {
        console.log('Testing message processing...');
        console.log(`Processing ${testMessages.length} messages`);
        
        const results = await processBatch(testMessages);
        
        console.log('Processing results:', results);
        console.log(`Successfully processed: ${results.successful}`);
        console.log(`Failed to process: ${results.failed}`);
        
        if (results.errors.length > 0) {
            console.error('Errors encountered:', results.errors);
        }
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testMessageProcessing();
} 