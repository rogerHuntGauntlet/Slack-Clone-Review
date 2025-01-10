-- Add reactions column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::JSONB;

-- Add reactions column to direct_messages table
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::JSONB;

-- Add foreign key constraint for user_id in messages table
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_user_id_fkey,
ADD CONSTRAINT messages_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id)
ON DELETE CASCADE; 