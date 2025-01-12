-- Drop all existing data
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE channel_members CASCADE;
TRUNCATE TABLE channels CASCADE;
TRUNCATE TABLE workspace_members CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- Reset the AI user
DELETE FROM user_profiles WHERE email = 'ai.assistant@ohfpartners.com';

-- Create AI user with a proper UUID
DO $$
DECLARE
    ai_user_id UUID;
BEGIN
    SELECT gen_random_uuid() INTO ai_user_id;
    
    INSERT INTO user_profiles (id, email, username, avatar_url)
    VALUES (
        ai_user_id,
        'ai.assistant@ohfpartners.com',
        'AI Assistant',
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url;
END $$; 