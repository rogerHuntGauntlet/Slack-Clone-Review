-- Add Pinecone fields to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS pinecone_index VARCHAR(255),
ADD COLUMN IF NOT EXISTS pinecone_namespace VARCHAR(255);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies
DO $$ 
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Users can only access their own agents" ON agents;
    
    -- Create new policy
    CREATE POLICY "Users can only access their own agents" ON agents
    FOR ALL
    USING (auth.uid() = user_id);
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_pinecone_index ON agents(pinecone_index);
CREATE INDEX IF NOT EXISTS idx_agents_pinecone_namespace ON agents(pinecone_namespace); 