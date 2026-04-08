-- Support requests table
CREATE TABLE portal_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_support_requests_org ON portal_support_requests(org_id);
CREATE INDEX idx_support_requests_user ON portal_support_requests(user_id);

-- RLS
ALTER TABLE portal_support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org support requests"
  ON portal_support_requests FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()));

CREATE POLICY "Users can create support requests"
  ON portal_support_requests FOR INSERT
  WITH CHECK (org_id IN (SELECT portal_user_org_ids()));
