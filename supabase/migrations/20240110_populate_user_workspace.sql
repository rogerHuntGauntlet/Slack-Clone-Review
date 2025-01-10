-- Create workspace for the specific user
DO $$ 
DECLARE
    user_id UUID := 'f3e28d45-e4b2-4f52-9de1-71d0141473df';
    workspace_id UUID;
    channel_id UUID;
BEGIN
    -- Create workspace
    INSERT INTO workspaces (name, created_by)
    VALUES ('Roger Time''s Workspace', user_id)
    RETURNING id INTO workspace_id;

    -- Add user as workspace admin
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, user_id, 'admin');

    -- Create work channel
    INSERT INTO channels (workspace_id, name, created_by)
    VALUES (workspace_id, 'work', user_id)
    RETURNING id INTO channel_id;

    -- Add welcome message to work channel
    WITH message_insert AS (
        INSERT INTO messages (channel_id, user_id, content)
        VALUES (channel_id, user_id, 'Welcome to the work channel! This is where we discuss work-related topics and projects.')
        RETURNING id
    )
    INSERT INTO message_reactions (message_id, user_id, emoji)
    SELECT id, user_id, '👋'
    FROM message_insert;

    -- Create social channel
    INSERT INTO channels (workspace_id, name, created_by)
    VALUES (workspace_id, 'social', user_id)
    RETURNING id INTO channel_id;

    -- Add welcome message to social channel
    WITH message_insert AS (
        INSERT INTO messages (channel_id, user_id, content)
        VALUES (channel_id, user_id, 'Welcome to the social channel! This is where we can chat about non-work topics and have fun discussions.')
        RETURNING id
    )
    INSERT INTO message_reactions (message_id, user_id, emoji)
    SELECT id, user_id, '🎉'
    FROM message_insert;

    -- Create general channel
    INSERT INTO channels (workspace_id, name, created_by)
    VALUES (workspace_id, 'general', user_id)
    RETURNING id INTO channel_id;

    -- Add welcome message to general channel
    WITH message_insert AS (
        INSERT INTO messages (channel_id, user_id, content)
        VALUES (channel_id, user_id, 'Welcome to the general channel! This is our main space for team communication.')
        RETURNING id
    )
    INSERT INTO message_reactions (message_id, user_id, emoji)
    SELECT id, user_id, '🚀'
    FROM message_insert;

END $$; 