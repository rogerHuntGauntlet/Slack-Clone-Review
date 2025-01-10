-- Create channel_views table
CREATE TABLE IF NOT EXISTS channel_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Create function to update or insert channel view
CREATE OR REPLACE FUNCTION update_channel_view(
  p_user_id UUID,
  p_channel_id UUID
) RETURNS void AS $$
BEGIN
  INSERT INTO channel_views (user_id, channel_id, last_viewed_at)
  VALUES (p_user_id, p_channel_id, NOW())
  ON CONFLICT (user_id, channel_id)
  DO UPDATE SET last_viewed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 