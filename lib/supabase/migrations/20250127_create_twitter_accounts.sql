-- Create Twitter accounts table
CREATE TABLE IF NOT EXISTS twitter_accounts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS twitter_accounts_user_id_idx ON twitter_accounts(user_id);

-- Enable Row Level Security
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read twitter accounts
CREATE POLICY "Anyone can read twitter accounts"
  ON twitter_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow service role to insert/update twitter accounts
CREATE POLICY "Service role can manage twitter accounts"
  ON twitter_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
