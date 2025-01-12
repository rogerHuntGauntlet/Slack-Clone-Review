-- Create a table for founder codes usage count
CREATE TABLE IF NOT EXISTS founder_code_count (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    total_used INT DEFAULT 0,
    max_allowed INT DEFAULT 500
);

-- Create a table for founder coupon codes
CREATE TABLE IF NOT EXISTS founder_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES auth.users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    terms_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for riddle solutions
CREATE TABLE IF NOT EXISTS riddle_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for access records (combines all access methods)
CREATE TABLE IF NOT EXISTS access_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
    access_type TEXT NOT NULL CHECK (access_type IN ('founder_code', 'riddle', 'payment')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    reference_id UUID,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_founder_codes_used_by ON founder_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_access_records_user_id ON access_records(user_id);

-- Enable RLS
ALTER TABLE founder_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE riddle_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_code_count ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own riddle completions" ON riddle_completions;
DROP POLICY IF EXISTS "Users can view their own access records" ON access_records;
DROP POLICY IF EXISTS "Anyone can read founder code count" ON founder_code_count;
DROP POLICY IF EXISTS "Service role can update founder code count" ON founder_code_count;
DROP POLICY IF EXISTS "Service role can insert founder codes" ON founder_codes;
DROP POLICY IF EXISTS "Service role can insert riddle completions" ON riddle_completions;
DROP POLICY IF EXISTS "Service role can insert access records" ON access_records;

-- Create policies
CREATE POLICY "Users can view their own riddle completions" ON riddle_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own access records" ON access_records
    FOR SELECT USING (auth.uid() = user_id);

-- Allow anyone to read the founder code count
CREATE POLICY "Anyone can read founder code count" ON founder_code_count
    FOR SELECT USING (true);

-- Only allow service role to update the count
CREATE POLICY "Service role can update founder code count" ON founder_code_count
    FOR UPDATE USING (auth.role() = 'service_role');

-- Allow service role to insert records
CREATE POLICY "Service role can insert founder codes" ON founder_codes
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert riddle completions" ON riddle_completions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert access records" ON access_records
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Initialize founder code count if not exists
INSERT INTO founder_code_count (total_used, max_allowed)
SELECT 0, 500
WHERE NOT EXISTS (SELECT 1 FROM founder_code_count); 