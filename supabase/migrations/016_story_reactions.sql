-- Create story_reactions table for likes and reactions on stories
CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON story_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_created_at ON story_reactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_reactions
-- Users can view all story reactions
CREATE POLICY "Users can view story reactions"
  ON story_reactions FOR SELECT
  USING (true);

-- Users can create their own reactions
CREATE POLICY "Users can create their own reactions"
  ON story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON story_reactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON story_reactions FOR DELETE
  USING (auth.uid() = user_id);

