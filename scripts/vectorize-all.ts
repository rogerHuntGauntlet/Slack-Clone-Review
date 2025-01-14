import { createClient } from '@supabase/supabase-js';
import { addMessages, Message } from '../utils/vectorStore';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DatabaseMessage {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    channel_id: string;
    channels: {
        workspace_id: string;
        name: string;
    } | null;
}

async function vectorizeAllMessages() {
    try {
        console.log('Starting vectorization process...');
        console.log('Connecting to Supabase...');
        
        // Get all messages with their channel and workspace info
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                user_id,
                channel_id,
                channels (
                    workspace_id,
                    name
                )
            `)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }

        if (!messages || messages.length === 0) {
            console.log('No messages found in database');
            return;
        }

        const typedMessages = messages as unknown as DatabaseMessage[];

        console.log(`Found ${typedMessages.length} messages to vectorize`);
        console.log('\nSample messages:');
        typedMessages.slice(0, 5).forEach((msg: DatabaseMessage) => {
            console.log(`- [${msg.channels?.name}] "${msg.content}" (ID: ${msg.id}, Workspace: ${msg.channels?.workspace_id})`);
        });

        // Format messages for vectorization
        const vectorMessages: Message[] = typedMessages.map((msg: DatabaseMessage) => ({
            id: msg.id,
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
            userId: msg.user_id,
            channelId: msg.channel_id,
            workspaceId: msg.channels?.workspace_id || ''
        }));

        // Process messages in chunks
        const chunkSize = 10;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < vectorMessages.length; i += chunkSize) {
            const chunk = vectorMessages.slice(i, i + chunkSize);
            const chunkNum = Math.floor(i/chunkSize) + 1;
            const totalChunks = Math.ceil(vectorMessages.length/chunkSize);
            
            console.log(`\nProcessing chunk ${chunkNum}/${totalChunks}`);
            console.log('Messages in this chunk:');
            chunk.forEach((msg: Message) => console.log(`- "${msg.content}"`));
            
            try {
                await addMessages(chunk);
                successCount += chunk.length;
                console.log(`✓ Successfully processed chunk ${chunkNum}`);
            } catch (error) {
                console.error(`× Error processing chunk ${chunkNum}:`, error);
                errorCount += chunk.length;
            }
            
            // Progress report
            console.log(`\nProgress: ${successCount + errorCount}/${vectorMessages.length} messages processed`);
            console.log(`Success: ${successCount}, Errors: ${errorCount}`);
            
            // Add a delay between chunks
            if (i + chunkSize < vectorMessages.length) {
                console.log('Waiting 2 seconds before next chunk...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\nVectorization complete!');
        console.log('Final results:');
        console.log(`- Total messages: ${vectorMessages.length}`);
        console.log(`- Successfully vectorized: ${successCount}`);
        console.log(`- Failed to vectorize: ${errorCount}`);
        
    } catch (error) {
        console.error('Fatal error during vectorization:', error);
        process.exit(1);
    }
}

// Run the vectorization
console.log('Starting vectorization script...');
console.log('Environment:', {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '× Missing',
    SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '× Missing',
    OPENAI_KEY: process.env.OPENAI_API_KEY ? '✓ Set' : '× Missing',
    PINECONE_KEY: process.env.PINECONE_API_KEY ? '✓ Set' : '× Missing',
    PINECONE_INDEX: process.env.PINECONE_INDEX_NAME ? '✓ Set' : '× Missing'
});

vectorizeAllMessages(); 