-- Create user_presence table for tracking online/offline status
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view presence of their contacts
CREATE POLICY "Users can view presence of contacts"
  ON user_presence FOR SELECT
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR user_id IN (
      SELECT contact_id FROM contacts WHERE user_id::text = current_setting('app.user_id', true)
      UNION
      SELECT user_id FROM contacts WHERE contact_id::text = current_setting('app.user_id', true)
    )
  );

-- Policy: Users can update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true));

-- Policy: Users can insert their own presence
CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- Function to update last_seen automatically
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence_timestamp();

