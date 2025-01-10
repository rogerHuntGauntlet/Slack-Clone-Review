-- First create the AI Person
DO $$ 
DECLARE
    ai_user_id UUID;
    user_record RECORD;
BEGIN
    -- Create AI Person user profile
    INSERT INTO user_profiles (id, email, username, avatar_url, status, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'ai.assistant@chatgenius.ai',
        'AI Assistant',
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
        'online',
        NOW(),
        NOW()
    )
    RETURNING id INTO ai_user_id;

    -- For each existing user profile (excluding the AI Assistant)
    FOR user_record IN 
        SELECT id, username, email 
        FROM user_profiles
        WHERE id != ai_user_id
    LOOP
        -- Create workspace
        WITH workspace_insert AS (
            INSERT INTO workspaces (name, created_by)
            VALUES (user_record.username || '''s Workspace', user_record.id)
            RETURNING id
        ),
        -- Create additional channels (general is created by trigger)
        channels_insert AS (
            INSERT INTO channels (workspace_id, name, created_by)
            SELECT workspace_id, channel_name, user_record.id
            FROM workspace_insert,
            (VALUES 
                ('work', 'For all work-related discussions and projects'),
                ('social', 'A place for non-work conversations and fun')
            ) AS t(channel_name, description)
            RETURNING id, name, workspace_id
        )
        -- Add channel messages
        INSERT INTO messages (channel_id, user_id, content)
        SELECT 
            id,
            user_record.id,
            CASE 
                WHEN name = 'work' THEN 'Welcome to the work channel! This is where we discuss work-related topics and projects.'
                WHEN name = 'social' THEN 'Welcome to the social channel! This is where we can chat about non-work topics and have fun discussions.'
            END
        FROM channels_insert
        WHERE name IN ('work', 'social')
        RETURNING id;

        -- For each channel message, add replies and reactions
        FOR message_record IN 
            SELECT m.id, m.channel_id 
            FROM messages m
            JOIN channels c ON m.channel_id = c.id
            JOIN workspaces w ON c.workspace_id = w.id
            WHERE w.created_by = user_record.id
        LOOP
            -- Add replies from both user and AI
            WITH reply_insert AS (
                INSERT INTO messages (channel_id, user_id, content, parent_id)
                VALUES 
                    (message_record.channel_id, user_record.id, 'Great to be here! Looking forward to collaborating.', message_record.id),
                    (message_record.channel_id, ai_user_id, 'I''ll be here to help whenever needed!', message_record.id)
                RETURNING id
            )
            -- Add reactions to original message and replies
            INSERT INTO message_reactions (message_id, user_id, emoji)
            SELECT m_id, reactor_id, emoji
            FROM (
                SELECT message_record.id as m_id
                UNION ALL
                SELECT id FROM reply_insert
            ) messages,
            (VALUES 
                (user_record.id, '👍'),
                (user_record.id, '❤️'),
                (ai_user_id, '🎉'),
                (ai_user_id, '🚀'),
                (user_record.id, '💡')
            ) reactions(reactor_id, emoji);

        END LOOP;

        -- Create direct message conversation with AI
        WITH dm_insert AS (
            INSERT INTO direct_messages (sender_id, receiver_id, content)
            VALUES (user_record.id, ai_user_id, 'Hi AI Assistant! Looking forward to working with you.')
            RETURNING id
        ),
        reply_insert AS (
            INSERT INTO direct_messages (sender_id, receiver_id, content, parent_id)
            SELECT ai_user_id, user_record.id, 'Hello! I''m here to help make your experience better. Let me know if you need anything!', id
            FROM dm_insert
            RETURNING id
        )
        -- Add reactions to DM and reply
        INSERT INTO direct_message_reactions (message_id, user_id, emoji)
        SELECT m_id, reactor_id, emoji
        FROM (
            SELECT id as m_id FROM dm_insert
            UNION ALL
            SELECT id FROM reply_insert
        ) messages,
        (VALUES 
            (user_record.id, '👋'),
            (ai_user_id, '🤖'),
            (user_record.id, '😊'),
            (ai_user_id, '💫'),
            (user_record.id, '🌟')
        ) reactions(reactor_id, emoji);

        -- Create direct messages with other users (excluding AI)
        FOR other_user IN 
            SELECT id 
            FROM user_profiles 
            WHERE id != user_record.id AND id != ai_user_id
            LIMIT 3  -- Create DMs with 3 random users
        LOOP
            WITH dm_insert AS (
                INSERT INTO direct_messages (sender_id, receiver_id, content)
                VALUES (user_record.id, other_user.id, 'Hey! Looking forward to working with you.')
                RETURNING id
            ),
            reply_insert AS (
                INSERT INTO direct_messages (sender_id, receiver_id, content, parent_id)
                SELECT other_user.id, user_record.id, 'Thanks! Excited to collaborate!', id
                FROM dm_insert
                RETURNING id
            )
            -- Add reactions to DM and reply
            INSERT INTO direct_message_reactions (message_id, user_id, emoji)
            SELECT m_id, reactor_id, emoji
            FROM (
                SELECT id as m_id FROM dm_insert
                UNION ALL
                SELECT id FROM reply_insert
            ) messages,
            (VALUES 
                (user_record.id, '👋'),
                (other_user.id, '🤝'),
                (user_record.id, '😊'),
                (other_user.id, '💫'),
                (user_record.id, '🌟')
            ) reactions(reactor_id, emoji);
        END LOOP;

    END LOOP;
END $$; 