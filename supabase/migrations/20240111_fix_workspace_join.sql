-- Drop existing function if it exists
DROP FUNCTION IF EXISTS join_workspace;

-- Create a function to handle workspace joining
CREATE OR REPLACE FUNCTION join_workspace(
    workspace_id UUID
) RETURNS void AS $$
BEGIN
    -- Add user as workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, auth.uid(), 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_workspace TO authenticated; 