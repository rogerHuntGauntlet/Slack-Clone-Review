-- Add description column to workspaces table
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS description TEXT; 