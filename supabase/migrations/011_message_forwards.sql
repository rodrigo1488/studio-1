-- Create message_forwards table
CREATE TABLE IF NOT EXISTS message_forwards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  forwarded_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  forwarded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forwarded_to_room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_forwards_original_message_id ON message_forwards(original_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_forwarded_message_id ON message_forwards(forwarded_message_id);
CREATE INDEX IF NOT EXISTS idx_message_forwards_forwarded_by_user_id ON message_forwards(forwarded_by_user_id);

-- Enable RLS
ALTER TABLE message_forwards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view forwards of messages they can see
CREATE POLICY "Users can view message forwards"
  ON message_forwards FOR SELECT
  USING (
    forwarded_to_room_id IN (
      SELECT id FROM rooms WHERE id IN (
        SELECT room_id FROM room_members WHERE user_id::text = current_setting('app.user_id', true)
      )
      UNION
      SELECT id FROM direct_conversations WHERE user1_id::text = current_setting('app.user_id', true) OR user2_id::text = current_setting('app.user_id', true)
    )
  );

-- Policy: Users can create forwards
CREATE POLICY "Users can create message forwards"
  ON message_forwards FOR INSERT
  WITH CHECK (
    forwarded_by_user_id::text = current_setting('app.user_id', true)
    AND forwarded_to_room_id IN (
      SELECT id FROM rooms WHERE id IN (
        SELECT room_id FROM room_members WHERE user_id::text = current_setting('app.user_id', true)
      )
      UNION
      SELECT id FROM direct_conversations WHERE user1_id::text = current_setting('app.user_id', true) OR user2_id::text = current_setting('app.user_id', true)
    )
  );

