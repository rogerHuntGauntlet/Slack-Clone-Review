-- Create enum for file types
CREATE TYPE file_type AS ENUM ('text', 'image', 'video', 'audio');

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    configuration JSONB,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Create agent_files table
CREATE TABLE IF NOT EXISTS agent_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type file_type NOT NULL,
    url TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tags table (reusable across agents)
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for agent tags
CREATE TABLE IF NOT EXISTS agent_tags (
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, tag_id)
);

-- Create indexes
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agent_files_agent_id ON agent_files(agent_id);
CREATE INDEX idx_agent_tags_agent_id ON agent_tags(agent_id);
CREATE INDEX idx_agent_tags_tag_id ON agent_tags(tag_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_files_updated_at
    BEFORE UPDATE ON agent_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tags ENABLE ROW LEVEL SECURITY;

-- Agents policies
CREATE POLICY "Users can view their own agents"
    ON agents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents"
    ON agents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents"
    ON agents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents"
    ON agents FOR DELETE
    USING (auth.uid() = user_id);

-- Agent files policies
CREATE POLICY "Users can view files of their agents"
    ON agent_files FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_files.agent_id
        AND agents.user_id = auth.uid()
    ));

CREATE POLICY "Users can create files for their agents"
    ON agent_files FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_files.agent_id
        AND agents.user_id = auth.uid()
    ));

CREATE POLICY "Users can update files of their agents"
    ON agent_files FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_files.agent_id
        AND agents.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete files of their agents"
    ON agent_files FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_files.agent_id
        AND agents.user_id = auth.uid()
    ));

-- Tags policies (readable by all, writable by authenticated users)
CREATE POLICY "Tags are readable by all authenticated users"
    ON tags FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tags"
    ON tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Agent tags policies
CREATE POLICY "Users can view tags of their agents"
    ON agent_tags FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_tags.agent_id
        AND agents.user_id = auth.uid()
    ));

CREATE POLICY "Users can add tags to their agents"
    ON agent_tags FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_tags.agent_id
        AND agents.user_id = auth.uid()
    ));

CREATE POLICY "Users can remove tags from their agents"
    ON agent_tags FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_tags.agent_id
        AND agents.user_id = auth.uid()
    )); 