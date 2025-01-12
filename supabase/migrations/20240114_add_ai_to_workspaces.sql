-- Add AI assistant to all existing workspaces
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, '00000000-0000-0000-0000-000000000001', 'member'
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id 
  AND wm.user_id = '00000000-0000-0000-0000-000000000001'
);

-- Create trigger function
CREATE OR REPLACE FUNCTION add_ai_to_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS add_ai_on_workspace_create ON workspaces;
CREATE TRIGGER add_ai_on_workspace_create
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_ai_to_new_workspace(); 