-- Court Side AI Client Portal — Row Level Security Policies

-- Helper: check if user is a super_admin
CREATE OR REPLACE FUNCTION portal_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM portal_users
    WHERE auth_id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user's org_ids
CREATE OR REPLACE FUNCTION portal_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT org_id FROM portal_users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user's role in a specific org
CREATE OR REPLACE FUNCTION portal_user_role_in_org(p_org_id UUID)
RETURNS portal_user_role AS $$
  SELECT role FROM portal_users WHERE auth_id = auth.uid() AND org_id = p_org_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- portal_organizations
-- ==========================================
ALTER TABLE portal_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their orgs"
  ON portal_organizations FOR SELECT
  USING (id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Owners can update their org"
  ON portal_organizations FOR UPDATE
  USING (portal_user_role_in_org(id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_users
-- ==========================================
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read org members"
  ON portal_users FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Users can update own profile"
  ON portal_users FOR UPDATE
  USING (auth_id = auth.uid() OR portal_is_super_admin());

CREATE POLICY "Owners can insert team members"
  ON portal_users FOR INSERT
  WITH CHECK (
    portal_user_role_in_org(org_id) IN ('owner', 'admin')
    OR portal_is_super_admin()
    OR auth_id = auth.uid() -- allow self-insert during signup
  );

CREATE POLICY "Owners can delete team members"
  ON portal_users FOR DELETE
  USING (portal_user_role_in_org(org_id) = 'owner' OR portal_is_super_admin());

-- ==========================================
-- portal_agents
-- ==========================================
ALTER TABLE portal_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read agents"
  ON portal_agents FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage agents"
  ON portal_agents FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_phone_numbers
-- ==========================================
ALTER TABLE portal_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read phone numbers"
  ON portal_phone_numbers FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage phone numbers"
  ON portal_phone_numbers FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_outcome_categories
-- ==========================================
ALTER TABLE portal_outcome_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read outcomes"
  ON portal_outcome_categories FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage outcomes"
  ON portal_outcome_categories FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_calls
-- ==========================================
ALTER TABLE portal_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read calls"
  ON portal_calls FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

-- Writes handled by service role (webhooks)

-- ==========================================
-- portal_call_actions
-- ==========================================
ALTER TABLE portal_call_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read call actions"
  ON portal_call_actions FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

-- ==========================================
-- portal_contacts
-- ==========================================
ALTER TABLE portal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read contacts"
  ON portal_contacts FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

-- ==========================================
-- portal_bookings
-- ==========================================
ALTER TABLE portal_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read bookings"
  ON portal_bookings FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage bookings"
  ON portal_bookings FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin', 'member') OR portal_is_super_admin());

-- ==========================================
-- portal_subscriptions
-- ==========================================
ALTER TABLE portal_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read subscriptions"
  ON portal_subscriptions FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

-- ==========================================
-- portal_invoices
-- ==========================================
ALTER TABLE portal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read invoices"
  ON portal_invoices FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

-- ==========================================
-- portal_integrations
-- ==========================================
ALTER TABLE portal_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integrations"
  ON portal_integrations FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage integrations"
  ON portal_integrations FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_calendar_connections
-- ==========================================
ALTER TABLE portal_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read calendar connections"
  ON portal_calendar_connections FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage calendar connections"
  ON portal_calendar_connections FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_compliance_settings
-- ==========================================
ALTER TABLE portal_compliance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read compliance"
  ON portal_compliance_settings FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage compliance"
  ON portal_compliance_settings FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_verification
-- ==========================================
ALTER TABLE portal_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read verification"
  ON portal_verification FOR SELECT
  USING (org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Admins can manage verification"
  ON portal_verification FOR ALL
  USING (portal_user_role_in_org(org_id) IN ('owner', 'admin') OR portal_is_super_admin());

-- ==========================================
-- portal_notification_preferences
-- ==========================================
ALTER TABLE portal_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON portal_notification_preferences FOR SELECT
  USING (
    user_id IN (SELECT id FROM portal_users WHERE auth_id = auth.uid())
    OR portal_is_super_admin()
  );

CREATE POLICY "Users can manage own preferences"
  ON portal_notification_preferences FOR ALL
  USING (
    user_id IN (SELECT id FROM portal_users WHERE auth_id = auth.uid())
    OR portal_is_super_admin()
  );

-- ==========================================
-- portal_referrals
-- ==========================================
ALTER TABLE portal_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read referrals"
  ON portal_referrals FOR SELECT
  USING (referrer_org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());

CREATE POLICY "Members can create referrals"
  ON portal_referrals FOR INSERT
  WITH CHECK (referrer_org_id IN (SELECT portal_user_org_ids()) OR portal_is_super_admin());
