-- Add is_agent column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;

-- Update existing system users to be marked as agents
UPDATE user_profiles 
SET is_agent = true 
WHERE email LIKE '%@gauntlet.ai' OR email LIKE '%@ohfpartners.com';

-- Add a comment to explain the column
COMMENT ON COLUMN user_profiles.is_agent IS 'Indicates whether this user profile belongs to an AI agent'; 