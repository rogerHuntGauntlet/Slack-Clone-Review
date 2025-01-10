-- Enable RLS on tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public access to channels"
ON channels FOR ALL
USING (true);

CREATE POLICY "Allow public access to messages"
ON messages FOR ALL
USING (true);

-- Allow null values for created_by and user_id
ALTER TABLE channels ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL; 