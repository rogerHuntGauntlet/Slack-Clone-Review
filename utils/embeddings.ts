import OpenAI from 'openai';
import './loadEnv';

// Only initialize OpenAI on the server side
let openai: OpenAI | null = null;
if (typeof window === 'undefined') {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

export interface Message {
    id: string;
    content: string;
    timestamp: number;
    userId: string;
    channelId: string;
    workspaceId: string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const response = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, operation: 'embed' }),
        });
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to generate embedding');
        }
        
        return data.embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

export async function searchMessages(query: string, limit: number = 5) {
    try {
        const response = await fetch('/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: query, operation: 'search' }),
        });
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to search messages');
        }
        
        return data.results.map((match: any) => ({
            content: match.metadata?.content,
            score: match.score,
            metadata: match.metadata
        }));
    } catch (error) {
        console.error('Error searching messages:', error);
        throw error;
    }
}

export async function addMessages(messages: Message[]) {
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });
        
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to add messages');
        }
        
        return data.processed;
    } catch (error) {
        console.error('Error adding messages:', error);
        throw error;
    }
}

export async function processMessage(message: Message) {
    try {
        const embedding = await generateEmbedding(message.content);
        return {
            id: message.id,
            values: embedding,
            metadata: {
                content: message.content,
                timestamp: message.timestamp,
                userId: message.userId,
                channelId: message.channelId
            }
        };
    } catch (error) {
        console.error('Error processing message:', error);
        throw error;
    }
} 