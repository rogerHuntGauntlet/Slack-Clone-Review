import { Message, processMessage } from './embeddings';
import { getPineconeIndex } from './pinecone';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processBatch(messages: Message[]) {
    const results = {
        successful: 0,
        failed: 0,
        errors: [] as Error[]
    };

    // Process messages in batches
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        const processedBatch = await Promise.all(
            batch.map(async (message) => {
                for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                    try {
                        return await processMessage(message);
                    } catch (error) {
                        if (attempt === MAX_RETRIES - 1) {
                            results.failed++;
                            results.errors.push(error as Error);
                            return null;
                        }
                        await sleep(RETRY_DELAY * (attempt + 1));
                    }
                }
            })
        );

        // Filter out failed messages and upsert to Pinecone
        const validRecords = processedBatch.filter((record): record is NonNullable<typeof record> => record !== null);
        if (validRecords.length > 0) {
            try {
                const index = await getPineconeIndex();
                await index.upsert(validRecords);
                results.successful += validRecords.length;
            } catch (error) {
                results.failed += validRecords.length;
                results.errors.push(error as Error);
            }
        }
    }

    return results;
} 