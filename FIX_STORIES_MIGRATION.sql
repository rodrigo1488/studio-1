-- ============================================
-- FIX: Migration Stories com tratamento de constraints existentes
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Este script remove constraints existentes antes de recriar
-- ============================================

-- Remover constraints existentes se houverem
DO $$
BEGIN
  -- Remover constraint da tabela stories se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stories_user_id_fkey' 
    AND table_name = 'stories'
  ) THEN
    ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
    RAISE NOTICE 'Constraint stories_user_id_fkey removida';
  END IF;

  -- Remover constraints da tabela story_views se existirem
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'story_views_story_id_fkey' 
    AND table_name = 'story_views'
  ) THEN
    ALTER TABLE story_views DROP CONSTRAINT IF EXISTS story_views_story_id_fkey;
    RAISE NOTICE 'Constraint story_views_story_id_fkey removida';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'story_views_viewer_id_fkey' 
    AND table_name = 'story_views'
  ) THEN
    ALTER TABLE story_views DROP CONSTRAINT IF EXISTS story_views_viewer_id_fkey;
    RAISE NOTICE 'Constraint story_views_viewer_id_fkey removida';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'story_views_unique' 
    AND table_name = 'story_views'
  ) THEN
    ALTER TABLE story_views DROP CONSTRAINT IF EXISTS story_views_unique;
    RAISE NOTICE 'Constraint story_views_unique removida';
  END IF;
END $$;

-- Remover tabelas se existirem (CUIDADO: isso apagará dados existentes)
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

-- Criar tabela stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Adicionar foreign key constraint
ALTER TABLE stories 
ADD CONSTRAINT stories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Criar tabela story_views
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key constraints
ALTER TABLE story_views 
ADD CONSTRAINT story_views_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE;

ALTER TABLE story_views 
ADD CONSTRAINT story_views_viewer_id_fkey 
FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Adicionar unique constraint
ALTER TABLE story_views 
ADD CONSTRAINT story_views_unique UNIQUE(story_id, viewer_id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Habilitar Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houverem
DROP POLICY IF EXISTS "Users can view non-expired stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
DROP POLICY IF EXISTS "Users can view story views" ON story_views;
DROP POLICY IF EXISTS "Users can create story views" ON story_views;

-- Políticas RLS para stories
CREATE POLICY "Users can view non-expired stories"
  ON stories FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para story_views
CREATE POLICY "Users can view story views"
  ON story_views FOR SELECT
  USING (true);

CREATE POLICY "Users can create story views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Função para deletar stories expiradas
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Verificar se as tabelas foram criadas
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

