-- Disable RLS on all tables
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_reactions DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "channel_access" ON channels;
DROP POLICY IF EXISTS "channel_members_access" ON channel_members;
DROP POLICY IF EXISTS "message_access" ON messages;
DROP POLICY IF EXISTS "workspace_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_access" ON workspace_members; 