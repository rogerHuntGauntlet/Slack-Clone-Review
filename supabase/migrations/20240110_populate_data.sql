-- First, clear all existing data
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE channel_members CASCADE;
TRUNCATE TABLE channels CASCADE;
TRUNCATE TABLE workspace_members CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- Create the workspace population function first
CREATE OR REPLACE FUNCTION populate_user_workspace(user_id UUID, ai_user_id UUID)
RETURNS void AS $$
DECLARE
    workspace_id UUID;
    channel_id UUID;
    message_id UUID;
    channel_name TEXT;
    emoji_array TEXT[] := ARRAY['👋', '🎉', '🚀', '💡', '✨'];
    welcome_messages TEXT[] := ARRAY[
        'Welcome to your new channel! I''m here to help you get started.',
        'Exciting to see you here! Let''s make great things happen.',
        'This space is all yours! Feel free to explore and collaborate.'
    ];
    channel_names TEXT[] := ARRAY['general', 'random', 'introductions'];
BEGIN
    -- Create workspace
    INSERT INTO workspaces (id, name, created_by)
    VALUES (
        gen_random_uuid(),
        'My Workspace',
        user_id
    )
    RETURNING id INTO workspace_id;

    -- Add user to workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, user_id, 'admin');

    -- Add AI user to workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, ai_user_id, 'member');

    -- Create channels and add welcome messages
    FOREACH channel_name IN ARRAY channel_names
    LOOP
        -- Create channel
        INSERT INTO channels (id, name, workspace_id, created_by)
        VALUES (
            gen_random_uuid(),
            channel_name,
            workspace_id,
            user_id
        )
        RETURNING id INTO channel_id;

        -- Add user to channel
        INSERT INTO channel_members (channel_id, user_id, role)
        VALUES 
            (channel_id, user_id, 'admin'),
            (channel_id, ai_user_id, 'member');

        -- Add welcome message
        INSERT INTO messages (
            id,
            content,
            user_id,
            channel_id,
            reactions
        )
        VALUES (
            gen_random_uuid(),
            welcome_messages[array_position(channel_names, channel_name)],
            ai_user_id,
            channel_id,
            jsonb_build_object(
                emoji_array[1], jsonb_build_array(user_id::text),
                emoji_array[2], jsonb_build_array(user_id::text),
                emoji_array[3], jsonb_build_array(user_id::text),
                emoji_array[4], jsonb_build_array(user_id::text),
                emoji_array[5], jsonb_build_array(user_id::text)
            )
        )
        RETURNING id INTO message_id;

        -- Add AI reply to welcome message
        INSERT INTO messages (
            content,
            user_id,
            channel_id,
            parent_id,
            reactions
        )
        VALUES (
            'I''ll be here to help you make the most of this space! Let me know if you need anything.',
            ai_user_id,
            channel_id,
            message_id,
            jsonb_build_object(
                emoji_array[1], jsonb_build_array(user_id::text),
                emoji_array[2], jsonb_build_array(user_id::text),
                emoji_array[3], jsonb_build_array(user_id::text),
                emoji_array[4], jsonb_build_array(user_id::text),
                emoji_array[5], jsonb_build_array(user_id::text)
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create AI User and populate workspaces
DO $$
DECLARE
    ai_user_id UUID;
    user_record RECORD;
BEGIN
    -- Generate a new UUID for the AI user
    SELECT gen_random_uuid() INTO ai_user_id;
    
    -- Create or update the AI user
    INSERT INTO user_profiles (id, email, username, avatar_url)
    VALUES (
        ai_user_id,
        'ai.assistant@chatgenius.ai',
        'AI Assistant',
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
    )
    ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url
    RETURNING id INTO ai_user_id;

    -- Run the populate function for each existing user
    FOR user_record IN 
        SELECT id FROM user_profiles 
        WHERE email != 'ai.assistant@chatgenius.ai'
    LOOP
        PERFORM populate_user_workspace(user_record.id, ai_user_id);
    END LOOP;
END;
$$; 