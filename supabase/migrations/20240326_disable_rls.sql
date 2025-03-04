-- Disable RLS on all tables
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS channel_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS founder_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS riddle_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS access_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS founder_code_count DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_metadata DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS encryption_keys DISABLE ROW LEVEL SECURITY; 