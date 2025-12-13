-- ============================================
-- MIGRATION: Stories/Status Feature
-- ============================================
-- Execute este script no Supabase SQL Editor
-- ou via CLI: supabase db push
-- ============================================

-- Drop existing tables if they exist (CUIDADO: isso apagará dados existentes)
-- Se você já tem dados importantes, comente estas linhas e ajuste manualmente
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

-- Create stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add foreign key constraint separately
ALTER TABLE stories 
ADD CONSTRAINT stories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create story_views table to track who viewed which stories
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints separately
ALTER TABLE story_views 
ADD CONSTRAINT story_views_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

ALTER TABLE story_views 
ADD CONSTRAINT story_views_viewer_id_fkey 
FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE story_views 
ADD CONSTRAINT story_views_unique UNIQUE(story_id, viewer_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view non-expired stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
DROP POLICY IF EXISTS "Users can view story views" ON story_views;
DROP POLICY IF EXISTS "Users can create story views" ON story_views;

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

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
    RAISE NOTICE '✅ Tabela stories criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela stories';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'story_views') THEN
    RAISE NOTICE '✅ Tabela story_views criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela story_views';
  END IF;
END $$;

