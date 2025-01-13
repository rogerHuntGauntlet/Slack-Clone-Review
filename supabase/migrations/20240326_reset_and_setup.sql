-- First, disable RLS temporarily for the setup
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing data
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE channel_members CASCADE;
TRUNCATE TABLE channels CASCADE;
TRUNCATE TABLE workspace_members CASCADE;
TRUNCATE TABLE workspaces CASCADE;
TRUNCATE TABLE direct_messages CASCADE;
DELETE FROM user_profiles;

-- Create auth users first
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'ai.assistant@ohfpartners.com', NOW(), NOW(), NOW(), '{"provider":"email"}'),
    ('00000000-0000-0000-0000-000000000002', 'bro@ohfpartners.com', NOW(), NOW(), NOW(), '{"provider":"email"}')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Create identities for auth users
INSERT INTO auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"ai.assistant@ohfpartners.com"}', 'email', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"bro@ohfpartners.com"}', 'email', NOW(), NOW())
ON CONFLICT (provider, provider_id) DO UPDATE 
SET identity_data = EXCLUDED.identity_data;

-- Create system users with fixed UUIDs
INSERT INTO user_profiles (id, email, username, avatar_url, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'ai.assistant@ohfpartners.com', 'AI Assistant', 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y', 'online'),
    ('00000000-0000-0000-0000-000000000002', 'bro@ohfpartners.com', 'Bro', 'https://www.gravatar.com/avatar/11111111111111111111111111111111?d=mp&f=y', 'online')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    status = EXCLUDED.status;

-- Create the OHF Community workspace with fixed UUID
INSERT INTO workspaces (id, name, created_by, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'OHF Community', '00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    created_by = EXCLUDED.created_by;

-- Add system users to the workspace
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES 
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'admin')
ON CONFLICT (workspace_id, user_id) DO UPDATE 
SET role = EXCLUDED.role;

-- Create default channels
INSERT INTO channels (id, name, workspace_id, created_by, description)
VALUES 
    ('00000000-0000-0000-0000-000000000010', 'general', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'General discussion channel for all members'),
    ('00000000-0000-0000-0000-000000000011', 'social', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Channel for social interactions and casual chat'),
    ('00000000-0000-0000-0000-000000000012', 'work', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'Channel for work-related discussions')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Add system users to all channels
INSERT INTO channel_members (channel_id, user_id, role)
SELECT 
    c.id,
    u.id,
    'admin'
FROM channels c
CROSS JOIN user_profiles u
WHERE c.workspace_id = '00000000-0000-0000-0000-000000000000'
ON CONFLICT (channel_id, user_id) DO UPDATE 
SET role = EXCLUDED.role;

-- Create welcome messages in each channel
INSERT INTO messages (channel_id, user_id, content)
VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Welcome to the general channel! This is where we discuss everything about the workspace. 👋'),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Welcome to the social channel! Share fun stuff, memes, and get to know each other. 🎉'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Welcome to the work channel! This is where we focus on tasks and projects. 💼');

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY; 