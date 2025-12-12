-- Create message_reads table for read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Enable RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reads of messages they can see
CREATE POLICY "Users can view message reads"
  ON message_reads FOR SELECT
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

-- Policy: Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
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

