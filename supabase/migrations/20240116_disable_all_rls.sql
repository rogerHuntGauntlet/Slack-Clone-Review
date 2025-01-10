-- Disable RLS on all tables
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public access to channels" ON channels;
DROP POLICY IF EXISTS "Allow public access to messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own channel views" ON channel_views;
DROP POLICY IF EXISTS "channel_members_access" ON channel_members;
DROP POLICY IF EXISTS "channel_access" ON channels;
DROP POLICY IF EXISTS "message_access" ON messages;
DROP POLICY IF EXISTS "workspace_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_access" ON workspace_members;

-- Allow null values for user-related columns
ALTER TABLE channels ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE channel_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE workspace_members ALTER COLUMN user_id DROP NOT NULL; 