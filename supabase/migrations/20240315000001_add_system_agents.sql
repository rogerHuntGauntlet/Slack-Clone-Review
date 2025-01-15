-- Add system flag to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Update RLS policy to allow reading system agents
DROP POLICY IF EXISTS "Users can read system agents" ON agents;
CREATE POLICY "Users can read system agents"
ON agents FOR SELECT
USING (
  auth.uid() = user_id  -- User's own agents
  OR
  is_system = true      -- System agents
);

-- Create a system user if it doesn't exist
DO $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Create system user if it doesn't exist
  INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'system@gauntlet.ai',
    crypt('system', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    'authenticated'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO system_user_id;

  -- If system_user_id is null (meaning it already existed), get the ID
  IF system_user_id IS NULL THEN
    SELECT id INTO system_user_id
    FROM auth.users
    WHERE email = 'system@gauntlet.ai';
  END IF;

  -- Create the PhD Knowledge system agent if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM agents 
    WHERE name = 'PhD Knowledge Agent' 
    AND is_system = true
  ) THEN
    INSERT INTO agents (
      id,
      name,
      description,
      pinecone_index,
      is_system,
      is_active,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      '56bae458-b92b-43be-9008-9e706f06c83f',
      'PhD Knowledge Agent',
      'An AI agent with knowledge from PhD research papers and academic content. Use this agent to explore academic knowledge and develop your own specialized agents.',
      'phd-knowledge',
      true,
      true,
      system_user_id,
      NOW(),
      NOW()
    );
  END IF;
END
$$; 