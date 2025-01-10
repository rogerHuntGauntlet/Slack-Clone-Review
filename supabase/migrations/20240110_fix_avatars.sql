-- Update any existing avatar URLs to use Gravatar
UPDATE user_profiles 
SET avatar_url = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
WHERE avatar_url = 'https://your-default-ai-avatar.com/avatar.png'; 