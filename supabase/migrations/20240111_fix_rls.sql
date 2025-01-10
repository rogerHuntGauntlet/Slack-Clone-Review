-- Drop existing policies
DROP POLICY IF EXISTS "workspace_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_access" ON workspace_members;

-- Create new policies using auth.uid() directly
CREATE POLICY "workspace_access" ON workspaces
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "workspace_members_access" ON workspace_members
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid()
    );

-- Update existing workspace_members records to use auth IDs
UPDATE workspace_members
SET user_id = created_by
FROM workspaces
WHERE workspace_members.workspace_id = workspaces.id; 