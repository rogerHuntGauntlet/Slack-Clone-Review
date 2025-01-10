-- Create universal workspace if it doesn't exist
WITH ai_user AS (
    SELECT id FROM user_profiles WHERE email = 'ai.assistant@chatgenius.ai'
)
INSERT INTO workspaces (id, name, created_at)
SELECT '00000000-0000-0000-0000-000000000000', 'ChatGenius Community', NOW()
WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE id = '00000000-0000-0000-0000-000000000000');

-- Create general channel if it doesn't exist
WITH ai_user AS (
    SELECT id FROM user_profiles WHERE email = 'ai.assistant@chatgenius.ai'
)
INSERT INTO channels (name, description, workspace_id, created_by, created_at)
SELECT 'general', 'General discussion channel', '00000000-0000-0000-0000-000000000000', ai_user.id, NOW()
FROM ai_user
WHERE NOT EXISTS (
    SELECT 1 FROM channels 
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000' AND name = 'general'
);

-- Add all users to the universal workspace who aren't already members
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT '00000000-0000-0000-0000-000000000000', up.id, 'member', NOW()
FROM user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = '00000000-0000-0000-0000-000000000000' AND wm.user_id = up.id
); 