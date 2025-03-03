-- Remove unique constraint on email if it exists
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_email_key;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS cco_profiles_user_id_key;

-- Drop any other potential unique constraints
DO $$ 
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
    AND contype = 'u'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      'https://www.gravatar.com/avatar/' || md5(lower(trim(NEW.email))) || '?d=mp'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, user_profiles.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to keep user profile in sync
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users without duplicating emails
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT ON (id) id, email, raw_user_meta_data
    FROM auth.users
    ORDER BY id, created_at DESC
  LOOP
    INSERT INTO public.user_profiles (id, email, username, avatar_url)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'username', split_part(user_record.email, '@', 1)),
      COALESCE(user_record.raw_user_meta_data->>'avatar_url', 'https://www.gravatar.com/avatar/' || md5(lower(trim(user_record.email))) || '?d=mp')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, user_profiles.username),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url);
  END LOOP;
END $$; 