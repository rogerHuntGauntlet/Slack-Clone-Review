-- Create system user if it doesn't exist
INSERT INTO user_profiles (id, email, username, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system@chatgenius.ai',
    'System',
    'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
)
ON CONFLICT (email) DO UPDATE
SET id = EXCLUDED.id,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url;

-- Revert the column modifications that tried to make user_id nullable
ALTER TABLE channels ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE channel_members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE workspace_members ALTER COLUMN user_id SET NOT NULL;

-- Update any existing null values to use the system user
UPDATE channels 
SET created_by = '00000000-0000-0000-0000-000000000001'
WHERE created_by IS NULL;

UPDATE messages 
SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id IS NULL;

UPDATE channel_members 
SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id IS NULL;

UPDATE workspace_members 
SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id IS NULL; 