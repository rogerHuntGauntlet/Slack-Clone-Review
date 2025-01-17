-- Add rag_enabled flag to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT false;

-- Update existing agents that have a pinecone namespace to be rag_enabled
UPDATE agents
SET rag_enabled = true
WHERE pinecone_namespace IS NOT NULL; 