-- Create saved_posts table for favoriting posts
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);

-- Enable RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved posts
CREATE POLICY "Users can view own saved posts"
  ON saved_posts FOR SELECT
  USING (user_id::text = current_setting('app.user_id', true));

-- Policy: Users can save posts
CREATE POLICY "Users can save posts"
  ON saved_posts FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- Policy: Users can unsave posts
CREATE POLICY "Users can unsave posts"
  ON saved_posts FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true));

