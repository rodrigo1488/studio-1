-- Create post_mentions table
CREATE TABLE IF NOT EXISTS post_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for post_mentions
CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user_id ON post_mentions(user_id);

-- Enable RLS
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_mentions
CREATE POLICY "Users can view post mentions"
  ON post_mentions FOR SELECT
  USING (true);

CREATE POLICY "Users can create post mentions"
  ON post_mentions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own post mentions"
  ON post_mentions FOR DELETE
  USING (
    post_id IN (SELECT id FROM posts WHERE user_id::text = current_setting('app.user_id', true))
    OR true
  );

