import { addMessages, Message } from './vectorStore';
import { prisma } from '../lib/prisma';
import type { Message as PrismaMessage } from '.prisma/client';

const BATCH_SIZE = 50;

export async function processPendingMessages() {
    try {
        // Get unprocessed messages from the database
        const pendingMessages = await prisma.message.findMany({
            where: {
                isVectorized: false
            },
            take: BATCH_SIZE,
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (pendingMessages.length === 0) {
            console.log('No pending messages to process');
            return 0;
        }

        // Convert to the Message format expected by vectorStore
        const messages: Message[] = pendingMessages.map((msg: PrismaMessage) => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.createdAt.getTime(),
            userId: msg.userId,
            channelId: msg.channelId
        }));

        // Process messages using the vector store
        const processedCount = await addMessages(messages);

        // Update processed messages in the database
        await prisma.message.updateMany({
            where: {
                id: {
                    in: pendingMessages.map((msg: PrismaMessage) => msg.id)
                }
            },
            data: {
                isVectorized: true
            }
        });

        console.log(`Successfully processed ${processedCount} messages`);
        return processedCount;
    } catch (error) {
        console.error('Error in cron processor:', error);
        throw error;
    }
} 