import { NextRequest, NextResponse } from 'next/server';
import { addMessages } from '@/utils/vectorStore';
import { z } from 'zod';

// Input validation schema
const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    timestamp: z.number(),
    userId: z.string(),
    channelId: z.string()
});

const RequestSchema = z.object({
    messages: z.array(MessageSchema)
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = RequestSchema.parse(body);

        // Process messages using LangChain vector store
        const processedCount = await addMessages(messages);

        return NextResponse.json({
            status: 'success',
            data: {
                processed: processedCount
            }
        });
    } catch (error) {
        console.error('Error processing messages:', error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                status: 'error',
                error: 'Invalid request data',
                details: error.errors
            }, { status: 400 });
        }

        return NextResponse.json({
            status: 'error',
            error: 'Internal server error'
        }, { status: 500 });
    }
} 