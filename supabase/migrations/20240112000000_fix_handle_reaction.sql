-- Drop both versions of handle_reaction
DROP FUNCTION IF EXISTS handle_reaction(UUID, UUID, TEXT) CASCADE;

-- Create a single handle_reaction function
CREATE OR REPLACE FUNCTION handle_reaction(
    message_id UUID,
    user_id UUID,
    emoji TEXT
) RETURNS JSONB AS $$
DECLARE
    current_reactions JSONB;
BEGIN
    -- Get current reactions for the message
    SELECT COALESCE(reactions, '{}'::JSONB)
    INTO current_reactions
    FROM messages
    WHERE id = message_id;

    -- Update reactions for the message
    UPDATE messages
    SET reactions = CASE
        WHEN current_reactions->emoji IS NULL THEN
            jsonb_set(current_reactions, ARRAY[emoji], jsonb_build_array(user_id))
        WHEN user_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(current_reactions->emoji)))
        THEN
            CASE
                WHEN jsonb_array_length(current_reactions->emoji) = 1 THEN
                    current_reactions - emoji
                ELSE
                    jsonb_set(current_reactions, ARRAY[emoji], 
                        (current_reactions->emoji) - user_id::text)
            END
        ELSE
            jsonb_set(current_reactions, ARRAY[emoji], 
                (current_reactions->emoji) || jsonb_build_array(user_id))
    END
    WHERE id = message_id
    RETURNING reactions INTO current_reactions;

    RETURN current_reactions;
END;
$$ LANGUAGE plpgsql; 