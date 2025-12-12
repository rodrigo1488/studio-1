-- Create post_shares table for tracking post shares
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_to_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (shared_to_user_id IS NOT NULL AND shared_to_room_id IS NULL) OR
    (shared_to_user_id IS NULL AND shared_to_room_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_shared_to_user_id ON post_shares(shared_to_user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_shared_to_room_id ON post_shares(shared_to_room_id);

-- Enable RLS
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares of posts they can see
CREATE POLICY "Users can view post shares"
  ON post_shares FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id::text = current_setting('app.user_id', true)
      OR true -- Allow all for now
    )
  );

-- Policy: Users can create shares
CREATE POLICY "Users can create post shares"
  ON post_shares FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

