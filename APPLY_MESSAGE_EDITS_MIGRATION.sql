-- Script para aplicar a migration 018_message_edits.sql
-- Execute este script no Supabase SQL Editor ou via CLI

-- Create message_edits table to track message edit history
CREATE TABLE IF NOT EXISTS message_edits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  original_text TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_edits_message_id ON message_edits(message_id);
CREATE INDEX IF NOT EXISTS idx_message_edits_edited_at ON message_edits(edited_at);

-- Add is_edited column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_is_edited ON messages(is_edited);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON messages(edited_at);

-- Enable RLS
ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view message edits in their rooms" ON message_edits;
DROP POLICY IF EXISTS "Users can create edits for own messages" ON message_edits;

-- Policy: Users can view edits of messages in rooms they are members of
CREATE POLICY "Users can view message edits in their rooms"
  ON message_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN room_members rm ON m.room_id = rm.room_id
      WHERE m.id = message_edits.message_id
        AND rm.user_id::text = current_setting('app.user_id', true)
    )
  )
);

-- Policy: Users can only create edits for their own messages
CREATE POLICY "Users can create edits for own messages"
  ON message_edits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_edits.message_id
        AND m.sender_id::text = current_setting('app.user_id', true)
    )
  );

-- Verificar se as colunas foram criadas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_edited'
  ) THEN
    RAISE EXCEPTION 'Coluna is_edited não foi criada na tabela messages';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    RAISE EXCEPTION 'Coluna edited_at não foi criada na tabela messages';
  END IF;
  
  RAISE NOTICE 'Migration aplicada com sucesso!';
END $$;



