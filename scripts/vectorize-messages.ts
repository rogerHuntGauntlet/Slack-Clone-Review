import { createClient } from '@supabase/supabase-js';
import { addMessages } from '../utils/directVectorStore';
import '../utils/loadEnv';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseMessage {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    channel_id: string;
    is_vectorized: boolean;
}

async function main() {
    try {
        // Count unvectorized messages
        const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_vectorized', false);

        console.log(`Found ${count} unvectorized messages`);

        if (!count) {
            console.log('No messages to vectorize');
            return;
        }

        // Fetch unvectorized messages in batches
        const batchSize = 10;
        let processed = 0;

        while (processed < count) {
            console.log(`Fetching batch of messages (${processed + 1} to ${Math.min(processed + batchSize, count)})...`);
            
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('is_vectorized', false)
                .order('created_at', { ascending: true })
                .range(processed, processed + batchSize - 1);

            if (error) {
                throw error;
            }

            if (!messages || messages.length === 0) {
                break;
            }

            // Convert messages to the format expected by addMessages
            const formattedMessages = messages.map((msg: SupabaseMessage) => ({
                id: msg.id,
                content: msg.content,
                timestamp: new Date(msg.created_at).getTime(),
                userId: msg.user_id,
                channelId: msg.channel_id
            }));

            // Add messages to vector store
            console.log('Adding messages to vector store...');
            await addMessages(formattedMessages);

            // Mark messages as vectorized
            const { error: updateError } = await supabase
                .from('messages')
                .update({ is_vectorized: true })
                .in('id', messages.map((msg: SupabaseMessage) => msg.id));

            if (updateError) {
                throw updateError;
            }

            processed += messages.length;
            console.log(`Processed ${processed}/${count} messages`);

            // Add a delay between batches
            if (processed < count) {
                console.log('Waiting before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('Vectorization complete!');
    } catch (error) {
        console.error('Error during vectorization:', error);
        process.exit(1);
    }
}

main(); 