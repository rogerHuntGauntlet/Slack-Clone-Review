-- Create function to mark agent profiles
CREATE OR REPLACE FUNCTION mark_agent_profile(agent_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET is_agent = true
  WHERE id = agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to create the mark_agent_profile function
CREATE OR REPLACE FUNCTION create_mark_agent_profile_function()
RETURNS void AS $$
BEGIN
  -- First ensure the is_agent column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'is_agent'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_agent BOOLEAN DEFAULT false;
  END IF;

  -- Create or replace the function
  CREATE OR REPLACE FUNCTION mark_agent_profile(agent_id UUID)
  RETURNS void AS $func$
  BEGIN
    UPDATE user_profiles
    SET is_agent = true
    WHERE id = agent_id;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 