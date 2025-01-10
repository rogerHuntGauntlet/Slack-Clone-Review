-- Remove unique constraint on email if it exists
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_email_key;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS users_email_key;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://www.gravatar.com/avatar/' || md5(lower(trim(NEW.email))) || '?d=mp')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url;
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
    SELECT DISTINCT ON (email) id, email, raw_user_meta_data
    FROM auth.users
    ORDER BY email, created_at DESC
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
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url;
  END LOOP;
END $$; 