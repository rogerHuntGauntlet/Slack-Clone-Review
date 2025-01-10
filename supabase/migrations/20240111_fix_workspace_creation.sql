-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_workspace_with_auth;

-- Create a function to handle workspace creation
CREATE OR REPLACE FUNCTION create_workspace_with_auth(
    workspace_name TEXT
) RETURNS UUID AS $$
DECLARE
    workspace_id UUID;
BEGIN
    -- Insert workspace using auth user ID
    INSERT INTO workspaces (name, created_by)
    VALUES (workspace_name, auth.uid())
    RETURNING id INTO workspace_id;

    -- Add user as workspace admin
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, auth.uid(), 'admin');

    RETURN workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_with_auth TO authenticated;