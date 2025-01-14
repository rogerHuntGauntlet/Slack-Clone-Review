const { createClient } = require('@supabase/supabase-js');
const { addMessages } = require('../utils/directVectorStore');
require('../utils/loadEnv');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    try {
        // Count unvectorized messages
        const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('is_vectorized', false);

        if (countError) {
            throw countError;
        }

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
            
            const { data: messages, error: fetchError } = await supabase
                .from('messages')
                .select('*')
                .eq('is_vectorized', false)
                .order('created_at', { ascending: true })
                .range(processed, processed + batchSize - 1);

            if (fetchError) {
                throw fetchError;
            }

            if (!messages || messages.length === 0) {
                break;
            }

            // Convert messages to the format expected by addMessages
            const formattedMessages = messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                timestamp: new Date(msg.created_at).getTime(),
                userId: msg.user_id,
                channelId: msg.channel_id
            }));

            // Add messages to vector store
            console.log('Adding messages to vector store...');
            await addMessages(formattedMessages);

            // Mark messages as vectorized one by one
            for (const msg of messages) {
                try {
                    const { error: updateError } = await supabase
                        .from('messages')
                        .update({ is_vectorized: true })
                        .eq('id', msg.id);

                    if (updateError) {
                        console.error(`Error marking message ${msg.id} as vectorized:`, updateError);
                    }
                } catch (error) {
                    console.error(`Error marking message ${msg.id} as vectorized:`, error);
                }
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