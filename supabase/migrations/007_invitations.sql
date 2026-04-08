-- Team invitations table
CREATE TABLE portal_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_portal_invitations_org ON portal_invitations(org_id);
CREATE INDEX idx_portal_invitations_email ON portal_invitations(email);

-- RLS
ALTER TABLE portal_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their org"
  ON portal_invitations FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM portal_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Admins and owners can insert invitations"
  ON portal_invitations FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM portal_users
    WHERE auth_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')
  ));

CREATE POLICY "Admins and owners can update invitations"
  ON portal_invitations FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM portal_users
    WHERE auth_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')
  ));

CREATE POLICY "Admins and owners can delete invitations"
  ON portal_invitations FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM portal_users
    WHERE auth_id = auth.uid() AND role IN ('owner', 'admin', 'super_admin')
  ));
