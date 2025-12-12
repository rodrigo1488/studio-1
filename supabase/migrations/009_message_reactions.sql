-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions to messages they can see
CREATE POLICY "Users can view message reactions"
  ON message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages WHERE room_id IN (
        SELECT id FROM rooms WHERE id IN (
          SELECT room_id FROM room_members WHERE user_id::text = current_setting('app.user_id', true)
        )
        UNION
        SELECT id FROM direct_conversations WHERE user1_id::text = current_setting('app.user_id', true) OR user2_id::text = current_setting('app.user_id', true)
      )
    )
  );

-- Policy: Users can add reactions
CREATE POLICY "Users can add message reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id::text = current_setting('app.user_id', true)
    AND message_id IN (
      SELECT id FROM messages WHERE room_id IN (
        SELECT id FROM rooms WHERE id IN (
          SELECT room_id FROM room_members WHERE user_id::text = current_setting('app.user_id', true)
        )
        UNION
        SELECT id FROM direct_conversations WHERE user1_id::text = current_setting('app.user_id', true) OR user2_id::text = current_setting('app.user_id', true)
      )
    )
  );

-- Policy: Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true));

