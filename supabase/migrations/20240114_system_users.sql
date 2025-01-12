-- Add unique constraint on email if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_profiles_email_key'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Create or update system users
DO $$
DECLARE
    ai_user_id UUID := '00000000-0000-0000-0000-000000000001';
    bro_user_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- Create or update AI user
    INSERT INTO user_profiles (id, email, username, avatar_url)
    VALUES (
        ai_user_id,
        'system@ohfpartners.com',
        'AI Assistant',
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url;

    -- Create or update Bro user
    INSERT INTO user_profiles (id, email, username, avatar_url)
    VALUES (
        bro_user_id,
        'bro@ohfpartners.com',
        'Bro',
        'https://www.gravatar.com/avatar/11111111111111111111111111111111?d=mp&f=y'
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url;

    -- Add system users to all existing workspaces if not already members
    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, ai_user_id, 'member'
    FROM workspaces w
    WHERE NOT EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = w.id AND wm.user_id = ai_user_id
    );

    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, bro_user_id, 'member'
    FROM workspaces w
    WHERE NOT EXISTS (
        SELECT 1 FROM workspace_members wm 
        WHERE wm.workspace_id = w.id AND wm.user_id = bro_user_id
    );

    -- Add system users to all existing channels if not already members
    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT c.id, ai_user_id, 'member'
    FROM channels c
    WHERE NOT EXISTS (
        SELECT 1 FROM channel_members cm 
        WHERE cm.channel_id = c.id AND cm.user_id = ai_user_id
    );

    INSERT INTO channel_members (channel_id, user_id, role)
    SELECT c.id, bro_user_id, 'member'
    FROM channels c
    WHERE NOT EXISTS (
        SELECT 1 FROM channel_members cm 
        WHERE cm.channel_id = c.id AND cm.user_id = bro_user_id
    );
END $$; 