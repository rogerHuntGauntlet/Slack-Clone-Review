-- Drop existing policy if it exists
DROP POLICY IF EXISTS "channel_members_access" ON channel_members;

-- Create new policy for channel_members
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