-- Create channel_views table
CREATE TABLE channel_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    last_viewed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_channel_views_user_id ON channel_views(user_id);
CREATE INDEX idx_channel_views_channel_id ON channel_views(channel_id);

-- Create function to update channel view
CREATE OR REPLACE FUNCTION update_channel_view(
    p_channel_id UUID,
    p_user_id UUID
) RETURNS void AS $$
BEGIN
    INSERT INTO channel_views (channel_id, user_id, last_viewed_at)
    VALUES (p_channel_id, p_user_id, now())
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_viewed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_channel_view TO authenticated;

-- Enable RLS
ALTER TABLE channel_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own channel views"
    ON channel_views FOR ALL
    USING (user_id = auth.uid()); 