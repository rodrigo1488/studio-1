-- Create message_threads table to track thread relationships
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  root_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_message_id, root_message_id)
);

CREATE INDEX IF NOT EXISTS idx_message_threads_parent ON message_threads(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_root ON message_threads(root_message_id);

-- Add thread_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view threads in rooms they are members of
CREATE POLICY "Users can view threads in their rooms"
  ON message_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN room_members rm ON m.room_id = rm.room_id
      WHERE m.id = message_threads.parent_message_id
        AND rm.user_id::text = current_setting('app.user_id', true)
    )
  )
);

-- Policy: Users can create threads for messages in rooms they are members of
CREATE POLICY "Users can create threads in their rooms"
  ON message_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN room_members rm ON m.room_id = rm.room_id
      WHERE m.id = message_threads.parent_message_id
        AND rm.user_id::text = current_setting('app.user_id', true)
    )
  );

-- Function to get thread count for a message
CREATE OR REPLACE FUNCTION get_thread_count(message_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  thread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO thread_count
  FROM messages
  WHERE thread_id = message_id_param;
  
  RETURN COALESCE(thread_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_thread_count(UUID) TO authenticated;



