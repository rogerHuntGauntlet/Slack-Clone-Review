-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES user_profiles(id),
    receiver_id UUID NOT NULL REFERENCES user_profiles(id),
    parent_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    file_attachments JSONB,
    reactions JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_parent_id ON direct_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own direct messages"
    ON direct_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert their own direct messages"
    ON direct_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own direct messages"
    ON direct_messages FOR UPDATE
    USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own direct messages"
    ON direct_messages FOR DELETE
    USING (auth.uid() = sender_id);

-- Add function to handle message updates
CREATE OR REPLACE FUNCTION handle_direct_message_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message updates
CREATE TRIGGER direct_message_update_trigger
    BEFORE UPDATE ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_direct_message_update();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages; 