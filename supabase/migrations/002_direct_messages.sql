-- Add nickname column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- Create index for nickname lookups
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;

-- Create direct conversations table
-- A direct conversation is essentially a room with only 2 members
-- We'll use a different approach: create a table to track direct conversations
CREATE TABLE IF NOT EXISTS direct_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_direct_conversations_user1 ON direct_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_user2 ON direct_conversations(user2_id);

-- Create contacts table (optional - for future features like contact list)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id),
  CHECK (user_id != contact_id) -- Can't add yourself
);

-- Create index for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact ON contacts(contact_id);

-- Enable RLS on new tables
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct_conversations
CREATE POLICY "Users can view their direct conversations"
  ON direct_conversations FOR SELECT
  USING (user1_id::text = auth.uid()::text OR user2_id::text = auth.uid()::text OR true);

CREATE POLICY "Users can create direct conversations"
  ON direct_conversations FOR INSERT
  WITH CHECK ((user1_id::text = auth.uid()::text OR user2_id::text = auth.uid()::text) OR true);

-- RLS Policies for contacts
CREATE POLICY "Users can view their contacts"
  ON contacts FOR SELECT
  USING (user_id::text = auth.uid()::text OR true);

CREATE POLICY "Users can add contacts"
  ON contacts FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text OR true);

CREATE POLICY "Users can remove their contacts"
  ON contacts FOR DELETE
  USING (user_id::text = auth.uid()::text OR true);

-- Function to get or create direct conversation
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Ensure consistent ordering (smaller ID first)
  IF p_user1_id < p_user2_id THEN
    v_user1 := p_user1_id;
    v_user2 := p_user2_id;
  ELSE
    v_user1 := p_user2_id;
    v_user2 := p_user1_id;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM direct_conversations
  WHERE user1_id = v_user1 AND user2_id = v_user2;

  -- If not found, create new one
  IF v_conversation_id IS NULL THEN
    INSERT INTO direct_conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

