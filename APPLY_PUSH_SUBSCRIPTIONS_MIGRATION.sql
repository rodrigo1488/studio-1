-- Migration para criar tabela push_subscriptions
-- Execute este script no SQL Editor do Supabase Dashboard

-- Drop table if exists (para reaplicar migration se necessário)
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Drop policies if they exist
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON push_subscriptions;

-- Drop trigger and function if they exist
DROP TRIGGER IF EXISTS update_push_subscription_updated_at ON push_subscriptions;
DROP FUNCTION IF EXISTS update_push_subscription_timestamp();

-- Create push_subscriptions table for storing push notification subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Create indexes for better performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_push_subscription_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- Verificar se a tabela foi criada
SELECT 
  'Tabela push_subscriptions criada com sucesso!' as status,
  COUNT(*) as total_subscriptions
FROM push_subscriptions;

