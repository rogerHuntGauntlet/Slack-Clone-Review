-- Add is_public column to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update OHF Community workspace to be public
UPDATE workspaces 
SET is_public = true 
WHERE name = 'OHF Community';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_is_public ON workspaces(is_public);

-- Enable realtime for workspaces table if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces; 