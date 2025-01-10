-- First, let's see what users we have
DO $$ 
DECLARE
    user_record RECORD;
    workspace_id UUID;
    channel_id UUID;
    user_count INT;
BEGIN
    -- Get count of users
    SELECT COUNT(*) INTO user_count FROM user_profiles;
    RAISE NOTICE 'Found % users in user_profiles table', user_count;

    -- Get count of workspaces
    SELECT COUNT(*) INTO user_count FROM workspaces;
    RAISE NOTICE 'Found % existing workspaces', user_count;

    -- For each user profile
    FOR user_record IN 
        SELECT id, username, email 
        FROM user_profiles
    LOOP
        RAISE NOTICE 'Processing user: % (ID: %)', user_record.username, user_record.id;
        
        -- Check if user already has a workspace
        IF NOT EXISTS (
            SELECT 1 
            FROM workspace_members 
            WHERE user_id = user_record.id
        ) THEN
            RAISE NOTICE 'Creating workspace for user: %', user_record.username;
            
            -- Create workspace
            INSERT INTO workspaces (name, created_by)
            VALUES (user_record.username || '''s Workspace', user_record.id)
            RETURNING id INTO workspace_id;

            -- Add user as workspace admin
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (workspace_id, user_record.id, 'admin');

            -- Create work channel
            INSERT INTO channels (workspace_id, name, created_by)
            VALUES (workspace_id, 'work', user_record.id)
            RETURNING id INTO channel_id;

            -- Add welcome message to work channel
            WITH message_insert AS (
                INSERT INTO messages (channel_id, user_id, content)
                VALUES (channel_id, user_record.id, 'Welcome to the work channel! This is where we discuss work-related topics and projects.')
                RETURNING id
            )
            INSERT INTO message_reactions (message_id, user_id, emoji)
            SELECT id, user_record.id, '👋'
            FROM message_insert;

            -- Create social channel
            INSERT INTO channels (workspace_id, name, created_by)
            VALUES (workspace_id, 'social', user_record.id)
            RETURNING id INTO channel_id;

            -- Add welcome message to social channel
            WITH message_insert AS (
                INSERT INTO messages (channel_id, user_id, content)
                VALUES (channel_id, user_record.id, 'Welcome to the social channel! This is where we can chat about non-work topics and have fun discussions.')
                RETURNING id
            )
            INSERT INTO message_reactions (message_id, user_id, emoji)
            SELECT id, user_record.id, '🎉'
            FROM message_insert;

            -- Create general channel
            INSERT INTO channels (workspace_id, name, created_by)
            VALUES (workspace_id, 'general', user_record.id)
            RETURNING id INTO channel_id;

            -- Add welcome message to general channel
            WITH message_insert AS (
                INSERT INTO messages (channel_id, user_id, content)
                VALUES (channel_id, user_record.id, 'Welcome to the general channel! This is our main space for team communication.')
                RETURNING id
            )
            INSERT INTO message_reactions (message_id, user_id, emoji)
            SELECT id, user_record.id, '🚀'
            FROM message_insert;

            RAISE NOTICE 'Finished creating workspace and channels for: %', user_record.username;
        ELSE
            RAISE NOTICE 'User % already has a workspace', user_record.username;
        END IF;
    END LOOP;
END $$; 