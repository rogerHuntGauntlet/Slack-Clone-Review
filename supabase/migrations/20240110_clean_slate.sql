-- Drop existing tables if they exist
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS direct_message_reactions CASCADE;

-- Create fresh tables
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT,
    file_attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    parent_id UUID REFERENCES messages(id) ON DELETE CASCADE -- For replies
);

CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Separate tables for direct messages
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT,
    file_attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    parent_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE -- For replies
);

CREATE TABLE direct_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User profiles access
CREATE POLICY "user_profiles_select_all" ON user_profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Workspace access
CREATE POLICY "workspace_access" ON workspaces
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Channel access
CREATE POLICY "channel_access" ON channels
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = channels.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Channel members access
CREATE POLICY "channel_members_access" ON channel_members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM channels
            JOIN workspace_members ON workspace_members.workspace_id = channels.workspace_id
            WHERE channels.id = channel_members.channel_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Message access
CREATE POLICY "message_access" ON messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM channels
            JOIN workspace_members ON workspace_members.workspace_id = channels.workspace_id
            WHERE channels.id = messages.channel_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Direct message access
CREATE POLICY "direct_message_access" ON direct_messages
    FOR ALL TO authenticated
    USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Indexes for performance
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_channels_workspace ON channels(workspace_id);
CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_parent ON messages(parent_id);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_direct_messages_users ON direct_messages(sender_id, receiver_id);
CREATE INDEX idx_direct_messages_parent ON direct_messages(parent_id);
CREATE INDEX idx_direct_message_reactions_message ON direct_message_reactions(message_id);

-- Populate data
DO $$ 
DECLARE
    ai_user_id UUID;
    user_record RECORD;
    message_record RECORD;
    other_user RECORD;
    workspace_id UUID;
    channel_id UUID;
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
        ),
        reply_insert AS (
            INSERT INTO messages (channel_id, user_id, content, parent_id)
            SELECT 
                channel_id,
                ai_user_id,
                'I''ll be here to help whenever needed!',
                id
            FROM message_insert
            RETURNING id
        )
        INSERT INTO message_reactions (message_id, user_id, emoji)
        SELECT m_id, reactor_id, emoji
        FROM (
            SELECT id as m_id FROM message_insert
            UNION ALL
            SELECT id FROM reply_insert
        ) messages,
        (VALUES 
            (user_record.id, '👋'),
            (user_record.id, '❤️'),
            (ai_user_id, '🎉'),
            (ai_user_id, '🚀'),
            (user_record.id, '💡')
        ) reactions(reactor_id, emoji);

        -- Create social channel
        INSERT INTO channels (workspace_id, name, created_by)
        VALUES (workspace_id, 'social', user_record.id)
        RETURNING id INTO channel_id;

        -- Add welcome message to social channel
        WITH message_insert AS (
            INSERT INTO messages (channel_id, user_id, content)
            VALUES (channel_id, user_record.id, 'Welcome to the social channel! This is where we can chat about non-work topics and have fun discussions.')
            RETURNING id
        ),
        reply_insert AS (
            INSERT INTO messages (channel_id, user_id, content, parent_id)
            SELECT 
                channel_id,
                ai_user_id,
                'Looking forward to some fun conversations!',
                id
            FROM message_insert
            RETURNING id
        )
        INSERT INTO message_reactions (message_id, user_id, emoji)
        SELECT m_id, reactor_id, emoji
        FROM (
            SELECT id as m_id FROM message_insert
            UNION ALL
            SELECT id FROM reply_insert
        ) messages,
        (VALUES 
            (user_record.id, '👋'),
            (user_record.id, '🎉'),
            (ai_user_id, '😊'),
            (ai_user_id, '🌟'),
            (user_record.id, '🎮')
        ) reactions(reactor_id, emoji);

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