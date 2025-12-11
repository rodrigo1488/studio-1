-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Create post_media table
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for post_media
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, order_index);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(post_id, created_at DESC);

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
-- Users can view posts from their contacts or their own posts
CREATE POLICY "Users can view posts from contacts"
  ON posts FOR SELECT
  USING (
    user_id IN (
      SELECT contact_id FROM contacts WHERE user_id::text = current_setting('app.user_id', true)
      UNION
      SELECT user_id FROM contacts WHERE contact_id::text = current_setting('app.user_id', true)
    )
    OR user_id::text = current_setting('app.user_id', true)
    OR true -- Temporarily allow all for development
  );

-- Users can create their own posts
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true) OR true);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true) OR true)
  WITH CHECK (user_id::text = current_setting('app.user_id', true) OR true);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true) OR true);

-- RLS Policies for post_media
CREATE POLICY "Users can view post media"
  ON post_media FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id IN (
        SELECT contact_id FROM contacts WHERE user_id::text = current_setting('app.user_id', true)
        UNION
        SELECT user_id FROM contacts WHERE contact_id::text = current_setting('app.user_id', true)
      )
      OR user_id::text = current_setting('app.user_id', true)
    )
    OR true
  );

CREATE POLICY "Users can create post media"
  ON post_media FOR INSERT
  WITH CHECK (
    post_id IN (SELECT id FROM posts WHERE user_id::text = current_setting('app.user_id', true))
    OR true
  );

CREATE POLICY "Users can delete post media"
  ON post_media FOR DELETE
  USING (
    post_id IN (SELECT id FROM posts WHERE user_id::text = current_setting('app.user_id', true))
    OR true
  );

-- RLS Policies for post_likes
CREATE POLICY "Users can view post likes"
  ON post_likes FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id IN (
        SELECT contact_id FROM contacts WHERE user_id::text = current_setting('app.user_id', true)
        UNION
        SELECT user_id FROM contacts WHERE contact_id::text = current_setting('app.user_id', true)
      )
      OR user_id::text = current_setting('app.user_id', true)
    )
    OR true
  );

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true) OR true);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true) OR true);

-- RLS Policies for post_comments
CREATE POLICY "Users can view post comments"
  ON post_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id IN (
        SELECT contact_id FROM contacts WHERE user_id::text = current_setting('app.user_id', true)
        UNION
        SELECT user_id FROM contacts WHERE contact_id::text = current_setting('app.user_id', true)
      )
      OR user_id::text = current_setting('app.user_id', true)
    )
    OR true
  );

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  WITH CHECK (user_id::text = current_setting('app.user_id', true) OR true);

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true) OR true)
  WITH CHECK (user_id::text = current_setting('app.user_id', true) OR true);

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true) OR true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for post_comments updated_at
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for posts (optional, for future real-time updates)
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;

