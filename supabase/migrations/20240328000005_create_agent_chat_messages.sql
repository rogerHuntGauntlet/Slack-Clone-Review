-- Create agent_chat_messages table
CREATE TABLE IF NOT EXISTS public.agent_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read messages
CREATE POLICY "Allow authenticated users to read messages"
    ON public.agent_chat_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert messages"
    ON public.agent_chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_agent_chat_messages_agent_id ON public.agent_chat_messages(agent_id);
CREATE INDEX idx_agent_chat_messages_timestamp ON public.agent_chat_messages(timestamp DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_chat_messages_updated_at
    BEFORE UPDATE ON public.agent_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 