-- Add web_search_namespace column to agents table
ALTER TABLE agents
ADD COLUMN web_search_namespace VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_agents_web_search_namespace ON agents(web_search_namespace);

-- Create web_search_files table for tracking uploaded files
CREATE TABLE web_search_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster file lookups by agent
CREATE INDEX idx_web_search_files_agent_id ON web_search_files(agent_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_web_search_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_web_search_files_updated_at
  BEFORE UPDATE ON web_search_files
  FOR EACH ROW
  EXECUTE FUNCTION update_web_search_files_updated_at(); 