-- Create handle_reaction function
CREATE OR REPLACE FUNCTION handle_reaction(
  message_id UUID,
  user_id UUID,
  emoji TEXT
) RETURNS JSONB AS $$
DECLARE
  current_reactions JSONB;
  user_reactions TEXT[];
BEGIN
  -- Get current reactions for the message
  SELECT COALESCE(reactions, '{}'::JSONB)
  INTO current_reactions
  FROM messages
  WHERE id = message_id;

  -- Get current users who reacted with this emoji
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(current_reactions->emoji)
  )
  INTO user_reactions;

  -- Check if user has already reacted
  IF user_id::TEXT = ANY(user_reactions) THEN
    -- Remove user's reaction
    SELECT array_remove(user_reactions, user_id::TEXT)
    INTO user_reactions;
  ELSE
    -- Add user's reaction
    SELECT array_append(user_reactions, user_id::TEXT)
    INTO user_reactions;
  END IF;

  -- Update reactions for this emoji
  IF array_length(user_reactions, 1) > 0 THEN
    current_reactions := jsonb_set(
      current_reactions,
      ARRAY[emoji],
      to_jsonb(user_reactions)
    );
  ELSE
    current_reactions := current_reactions - emoji;
  END IF;

  -- Update the message
  UPDATE messages
  SET reactions = current_reactions
  WHERE id = message_id;

  RETURN current_reactions;
END;
$$ LANGUAGE plpgsql; 