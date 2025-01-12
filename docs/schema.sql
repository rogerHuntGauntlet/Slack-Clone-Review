-- SECTION 1: VIEW ALL TABLE DATA
-- Get list of all tables and their data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- Dynamic SQL to select from all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE') 
    LOOP
        EXECUTE format('SELECT * FROM %I;', r.table_name);
    END LOOP;
END $$;

-- SECTION 2: CLEAN ALL DATA
-- Truncate all tables dynamically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              ORDER BY table_name DESC) -- Reverse order to handle foreign keys
    LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE;', r.table_name);
    END LOOP;
END $$;

-- Reset the founder_code_count with TRUNCATE to ensure it's empty
TRUNCATE TABLE founder_code_count CASCADE;
INSERT INTO founder_code_count (total_used, max_allowed) VALUES (0, 500);

-- Disable RLS for all tables dynamically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE') 
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', r.table_name);
    END LOOP;
END $$;

-- Verify all tables are empty
SELECT 
    table_name, 
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::int as row_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name; 