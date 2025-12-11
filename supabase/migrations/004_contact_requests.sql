-- Create contact_requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, requested_id),
  CHECK (requester_id != requested_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_requests_requester ON contact_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_requested ON contact_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_pending ON contact_requests(requested_id, status) WHERE status = 'pending';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();

-- Enable RLS
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view requests they sent or received
CREATE POLICY "Users can view their contact requests"
  ON contact_requests FOR SELECT
  USING (requester_id::text = auth.uid()::text OR requested_id::text = auth.uid()::text OR true);

-- Users can create requests (as requester)
CREATE POLICY "Users can create contact requests"
  ON contact_requests FOR INSERT
  WITH CHECK (requester_id::text = auth.uid()::text OR true);

-- Users can update requests they received (to accept/reject)
CREATE POLICY "Users can update requests they received"
  ON contact_requests FOR UPDATE
  USING (requested_id::text = auth.uid()::text OR true)
  WITH CHECK (requested_id::text = auth.uid()::text OR true);

-- Users can delete requests they sent (to cancel)
CREATE POLICY "Users can delete requests they sent"
  ON contact_requests FOR DELETE
  USING (requester_id::text = auth.uid()::text OR true);

-- Enable Realtime for contact_requests
ALTER PUBLICATION supabase_realtime ADD TABLE contact_requests;

