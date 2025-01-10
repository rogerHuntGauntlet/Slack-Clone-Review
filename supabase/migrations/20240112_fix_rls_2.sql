-- Enable RLS on all tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "channel_access" ON channels;
DROP POLICY IF EXISTS "channel_members_access" ON channel_members;
DROP POLICY IF EXISTS "message_access" ON messages;

-- Create new policies
CREATE POLICY "channel_access" ON channels
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = channels.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "channel_members_access" ON channel_members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM channels
            JOIN workspace_members ON workspace_members.workspace_id = channels.workspace_id
            WHERE channels.id = channel_members.channel_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "message_access" ON messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM channels
            JOIN workspace_members ON workspace_members.workspace_id = channels.workspace_id
            WHERE channels.id = messages.channel_id
            AND workspace_members.user_id = auth.uid()
        )
    ); 