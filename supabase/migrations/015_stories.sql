-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create story_views table to track who viewed which stories
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  CONSTRAINT story_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(story_id, viewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stories
-- Users can view all non-expired stories
CREATE POLICY "Users can view non-expired stories"
  ON stories FOR SELECT
  USING (expires_at > NOW());

-- Users can create their own stories
CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for story_views
-- Users can view story views
CREATE POLICY "Users can view story views"
  ON story_views FOR SELECT
  USING (true);

-- Users can create story views
CREATE POLICY "Users can create story views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Function to automatically delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired stories (if pg_cron is available)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('delete-expired-stories', '0 * * * *', 'SELECT delete_expired_stories()');

