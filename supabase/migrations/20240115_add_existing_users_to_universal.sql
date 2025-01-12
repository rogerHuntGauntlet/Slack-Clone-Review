-- First ensure universal workspace exists
INSERT INTO workspaces (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'OHF Community', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add all users who aren't already members
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000000',
  up.id,
  'member',
  NOW()
FROM user_profiles up
LEFT JOIN workspace_members wm ON 
  wm.user_id = up.id AND 
  wm.workspace_id = '00000000-0000-0000-0000-000000000000'
WHERE wm.user_id IS NULL
AND up.id NOT IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'); -- Exclude system users

-- Ensure default channels exist
DO $$
DECLARE
  general_channel_id UUID;
  welcome_channel_id UUID;
  ai_user_id UUID := '00000000-0000-0000-0000-000000000001';
  bro_user_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Create general channel if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM channels 
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'general'
  ) THEN
    INSERT INTO channels (name, workspace_id, created_by, created_at)
    VALUES ('general', '00000000-0000-0000-0000-000000000000', ai_user_id, NOW())
    RETURNING id INTO general_channel_id;

    -- Add system users to channel
    INSERT INTO channel_members (channel_id, user_id, role)
    VALUES 
      (general_channel_id, ai_user_id, 'member'),
      (general_channel_id, bro_user_id, 'member');

    -- Add welcome message
    INSERT INTO messages (content, channel_id, user_id, created_at)
    VALUES ('Welcome to the OHF Community! 👋 This is our global workspace where all members can connect and collaborate. Feel free to introduce yourself and join the discussions! 🌟', general_channel_id, ai_user_id, NOW());
  END IF;

  -- Create welcome channel if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM channels 
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'welcome'
  ) THEN
    INSERT INTO channels (name, workspace_id, created_by, created_at)
    VALUES ('welcome', '00000000-0000-0000-0000-000000000000', ai_user_id, NOW())
    RETURNING id INTO welcome_channel_id;

    -- Add system users to channel
    INSERT INTO channel_members (channel_id, user_id, role)
    VALUES 
      (welcome_channel_id, ai_user_id, 'member'),
      (welcome_channel_id, bro_user_id, 'member');

    -- Add welcome message
    INSERT INTO messages (content, channel_id, user_id, created_at)
    VALUES ('Hey newcomers! 👋 Welcome to OHF Community! This channel is dedicated to welcoming new members. When you join, drop a quick hello and tell us a bit about yourself! 🎉', welcome_channel_id, ai_user_id, NOW());
  END IF;

  -- Add all users to both channels
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    c.id,
    up.id,
    'member'
  FROM user_profiles up
  CROSS JOIN channels c
  WHERE c.workspace_id = '00000000-0000-0000-0000-000000000000'
  AND up.id NOT IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
  AND NOT EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = c.id 
    AND cm.user_id = up.id
  );
END $$; 