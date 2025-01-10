-- Drop existing tables first (this will automatically drop dependent triggers)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS channel_members CASCADE;
DROP TABLE IF EXISTS channels CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_thread_metadata() CASCADE;
DROP FUNCTION IF EXISTS handle_message_update() CASCADE;
DROP FUNCTION IF EXISTS handle_reaction(UUID, UUID, TEXT) CASCADE;

-- Create channels table
CREATE TABLE channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_private BOOLEAN DEFAULT false,
    description TEXT
);

-- Create channel_members table
CREATE TABLE channel_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    thread_ts TIMESTAMPTZ,  -- Timestamp when thread was started, null for main messages
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_direct_message BOOLEAN DEFAULT false,
    file_attachments JSONB,
    reactions JSONB DEFAULT '{}'::jsonb,
    reply_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    is_inline_thread BOOLEAN DEFAULT false -- Whether thread replies should show inline
);

-- Add indexes for performance
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_thread_ts ON messages(thread_ts);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channels_workspace_id ON channels(workspace_id);

-- Add function to update thread metadata
CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        -- Update reply count and last_reply_at for parent message
        UPDATE messages
        SET reply_count = (
            SELECT COUNT(*)
            FROM messages
            WHERE parent_id = NEW.parent_id
        ),
        last_reply_at = NEW.created_at,
        updated_at = now()
        WHERE id = NEW.parent_id;

        -- Set thread_ts if not already set
        IF NEW.thread_ts IS NULL THEN
            NEW.thread_ts = (
                SELECT COALESCE(thread_ts, created_at)
                FROM messages
                WHERE id = NEW.parent_id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thread metadata
CREATE TRIGGER update_thread_metadata_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_metadata();

-- Function to handle message updates
CREATE OR REPLACE FUNCTION handle_message_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message updates
CREATE TRIGGER message_update_trigger
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_message_update();

-- Create function to handle reactions
CREATE OR REPLACE FUNCTION handle_reaction(
    p_message_id UUID,
    p_user_id UUID,
    p_emoji TEXT
) RETURNS messages AS $$
DECLARE
    result messages;
BEGIN
    -- Update reactions for the message
    UPDATE messages
    SET reactions = CASE
        WHEN reactions->p_emoji IS NULL THEN
            jsonb_set(reactions, ARRAY[p_emoji], jsonb_build_array(p_user_id::text))
        WHEN p_user_id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(reactions->p_emoji)))
        THEN
            CASE
                WHEN jsonb_array_length(reactions->p_emoji) = 1 THEN
                    reactions - p_emoji
                ELSE
                    jsonb_set(reactions, ARRAY[p_emoji], 
                        (reactions->p_emoji) - p_user_id::text)
            END
        ELSE
            jsonb_set(reactions, ARRAY[p_emoji], 
                (reactions->p_emoji) || jsonb_build_array(p_user_id::text))
    END
    WHERE id = p_message_id
    RETURNING *
    INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS on all tables
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members; 