-- Add temporary message support
-- Add expires_at column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;

-- Add temporary_message_ttl column to rooms table (in minutes)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS temporary_message_ttl INTEGER DEFAULT NULL;

-- Note: We don't create an index with NOW() in the predicate because NOW() is not IMMUTABLE
-- The index on expires_at WHERE expires_at IS NOT NULL is sufficient for cleanup queries

-- Function to clean up expired messages (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM messages
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_messages() TO authenticated;

-- Create a comment explaining the function
COMMENT ON FUNCTION cleanup_expired_messages() IS 'Deletes all messages that have expired (expires_at <= NOW()). Returns the number of deleted messages.';


