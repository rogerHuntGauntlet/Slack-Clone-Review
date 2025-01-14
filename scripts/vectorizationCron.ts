import { processPendingMessages } from '../utils/cronProcessor';

async function runVectorization() {
    console.log('Starting message vectorization:', new Date().toISOString());
    try {
        const processedCount = await processPendingMessages();
        console.log(`Job completed. Processed ${processedCount} messages.`);
    } catch (error) {
        console.error('Error in vectorization job:', error);
        process.exit(1);
    }
    process.exit(0);
}

// Run immediately
runVectorization(); 