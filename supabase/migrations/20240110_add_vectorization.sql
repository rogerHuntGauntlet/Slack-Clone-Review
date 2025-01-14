-- Add vectorization tracking to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_vectorized BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_vectorized ON messages(is_vectorized) WHERE is_vectorized = false; 