-- Add is_system column to agents table
ALTER TABLE agents ADD COLUMN is_system BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX idx_agents_is_system ON agents(is_system);

-- Add policy for system agents
CREATE POLICY "System agents are readable by all authenticated users"
    ON agents FOR SELECT
    USING (is_system = true OR auth.uid() = user_id); 