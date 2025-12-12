-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_room_id ON typing_indicators(room_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id ON typing_indicators(user_id);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view typing indicators in their rooms
CREATE POLICY "Users can view typing indicators"
  ON typing_indicators FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM rooms WHERE id IN (
        SELECT room_id FROM room_members WHERE user_id::text = current_setting('app.user_id', true)
      )
      UNION
      SELECT id FROM direct_conversations WHERE user1_id::text = current_setting('app.user_id', true) OR user2_id::text = current_setting('app.user_id', true)
    )
  );

-- Policy: Users can update their own typing status
CREATE POLICY "Users can update own typing status"
  ON typing_indicators FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true));

-- Policy: Users can insert their own typing status
CREATE POLICY "Users can insert own typing status"
  ON typing_indicators FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_typing_indicator_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_typing_indicator_updated_at
  BEFORE UPDATE ON typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_typing_indicator_timestamp();

