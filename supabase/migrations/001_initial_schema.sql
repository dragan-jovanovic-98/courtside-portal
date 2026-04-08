-- Court Side AI Client Portal — Initial Schema
-- All tables prefixed with portal_ to coexist with existing tables

-- Enums
CREATE TYPE portal_call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE portal_call_status AS ENUM ('completed', 'missed', 'voicemail', 'abandoned', 'transferred');
CREATE TYPE portal_user_role AS ENUM ('owner', 'admin', 'member', 'viewer', 'super_admin');
CREATE TYPE portal_agent_status AS ENUM ('active', 'pending', 'inactive');
CREATE TYPE portal_booking_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');

-- Organizations (tenants)
CREATE TABLE portal_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  business_type TEXT,
  logo_url TEXT,
  business_phone TEXT,
  website TEXT,
  address TEXT,
  country TEXT DEFAULT 'CA',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  business_hours JSONB DEFAULT '{"rules": [{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}]}',
  primary_email TEXT,
  billing_email TEXT,
  stripe_customer_id TEXT UNIQUE,
  conversion_metric_label TEXT NOT NULL DEFAULT 'Appointments Booked',
  average_order_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (org-scoped, separate from auth.users)
CREATE TABLE portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  role portal_user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(auth_id, org_id)
);

-- AI Agents
CREATE TABLE portal_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_type TEXT DEFAULT 'General',
  direction portal_call_direction NOT NULL DEFAULT 'inbound',
  status portal_agent_status NOT NULL DEFAULT 'pending',
  phone_number_id UUID,
  livekit_agent_id TEXT,
  llm_provider TEXT NOT NULL DEFAULT 'openai',
  llm_model TEXT NOT NULL DEFAULT 'gpt-4o',
  voice_id TEXT,
  voice_gender TEXT DEFAULT 'Female',
  system_prompt TEXT,
  purpose_description TEXT,
  preferred_greeting TEXT,
  tools_config JSONB DEFAULT '[]',
  additional_notes TEXT,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  booking_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phone Numbers (Twilio)
CREATE TABLE portal_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  twilio_sid TEXT,
  number TEXT NOT NULL,
  friendly_name TEXT,
  type TEXT NOT NULL DEFAULT 'inbound',
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  total_calls_handled INTEGER NOT NULL DEFAULT 0,
  total_texts_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outcome Categories (configurable per org, seeded by industry)
CREATE TABLE portal_outcome_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  impact_tier TEXT NOT NULL CHECK (impact_tier IN ('high', 'medium', 'low')),
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_conversion BOOLEAN NOT NULL DEFAULT false,
  close_likelihood INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts (people extracted from calls)
CREATE TABLE portal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  first_call_id UUID,
  total_calls INTEGER NOT NULL DEFAULT 1,
  last_call_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, phone_number)
);

-- Calls
CREATE TABLE portal_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES portal_agents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES portal_contacts(id) ON DELETE SET NULL,
  direction portal_call_direction NOT NULL DEFAULT 'inbound',
  status portal_call_status NOT NULL,
  outcome_category_id UUID REFERENCES portal_outcome_categories(id) ON DELETE SET NULL,
  caller_number TEXT,
  caller_name TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_after_hours BOOLEAN NOT NULL DEFAULT false,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score NUMERIC(3,2),
  engagement_level TEXT,
  outcome_confidence NUMERIC(3,2),
  ai_summary TEXT,
  summary_one_line TEXT,
  transcript JSONB,
  transcript_text TEXT,
  recording_url TEXT,
  livekit_room_id TEXT,
  twilio_call_sid TEXT,
  latency_avg_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call Actions / Tool Calls
CREATE TABLE portal_call_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES portal_calls(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings
CREATE TABLE portal_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES portal_calls(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES portal_agents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES portal_contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  service_type TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status portal_booking_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  calendar_connection_id UUID,
  calendar_provider TEXT,
  calendar_event_id TEXT,
  calendar_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'not_applicable',
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (billing)
CREATE TABLE portal_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  plan_name TEXT,
  price_monthly NUMERIC,
  call_minutes_limit INTEGER NOT NULL DEFAULT 0,
  call_minutes_used INTEGER NOT NULL DEFAULT 0,
  phone_numbers_limit INTEGER NOT NULL DEFAULT 0,
  phone_numbers_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices (synced from Stripe)
CREATE TABLE portal_invoices (
  id TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_remaining NUMERIC NOT NULL DEFAULT 0,
  created_at_stripe TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrations (OAuth connections)
CREATE TABLE portal_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  config JSONB DEFAULT '{}',
  account_email TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Connections
CREATE TABLE portal_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES portal_integrations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  color TEXT,
  is_enabled_for_display BOOLEAN NOT NULL DEFAULT false,
  sync_direction TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance Settings
CREATE TABLE portal_compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  auto_sms_stop BOOLEAN NOT NULL DEFAULT true,
  auto_verbal_dnc BOOLEAN NOT NULL DEFAULT true,
  national_dnc_check BOOLEAN NOT NULL DEFAULT true,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification (for SMS capabilities)
CREATE TABLE portal_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  business_name TEXT,
  business_ein TEXT,
  business_address TEXT,
  transactional_sms_approved BOOLEAN NOT NULL DEFAULT false,
  marketing_sms_approved BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE portal_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals
CREATE TABLE portal_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id UUID NOT NULL REFERENCES portal_organizations(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_org_id UUID REFERENCES portal_organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'signed_up', 'rewarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK constraints for circular references
ALTER TABLE portal_agents ADD CONSTRAINT fk_agents_phone
  FOREIGN KEY (phone_number_id) REFERENCES portal_phone_numbers(id) ON DELETE SET NULL;
ALTER TABLE portal_contacts ADD CONSTRAINT fk_contacts_first_call
  FOREIGN KEY (first_call_id) REFERENCES portal_calls(id) ON DELETE SET NULL;
ALTER TABLE portal_bookings ADD CONSTRAINT fk_bookings_calendar
  FOREIGN KEY (calendar_connection_id) REFERENCES portal_calendar_connections(id) ON DELETE SET NULL;
ALTER TABLE portal_phone_numbers ADD CONSTRAINT fk_phone_agent
  FOREIGN KEY (agent_id) REFERENCES portal_agents(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_portal_calls_org_started ON portal_calls(org_id, started_at DESC);
CREATE INDEX idx_portal_calls_org_agent ON portal_calls(org_id, agent_id);
CREATE INDEX idx_portal_calls_org_outcome ON portal_calls(org_id, outcome_category_id);
CREATE INDEX idx_portal_calls_caller ON portal_calls(org_id, caller_number);
CREATE INDEX idx_portal_calls_sentiment ON portal_calls(org_id, sentiment);
CREATE INDEX idx_portal_calls_direction ON portal_calls(org_id, direction);
CREATE INDEX idx_portal_calls_after_hours ON portal_calls(org_id, is_after_hours);
CREATE INDEX idx_portal_call_actions_call ON portal_call_actions(call_id);
CREATE INDEX idx_portal_contacts_org ON portal_contacts(org_id);
CREATE INDEX idx_portal_contacts_phone ON portal_contacts(org_id, phone_number);
CREATE INDEX idx_portal_bookings_org_time ON portal_bookings(org_id, scheduled_at);
CREATE INDEX idx_portal_users_auth ON portal_users(auth_id);
CREATE INDEX idx_portal_users_org ON portal_users(org_id);
CREATE INDEX idx_portal_subscriptions_org ON portal_subscriptions(org_id);
CREATE INDEX idx_portal_invoices_org ON portal_invoices(org_id);

-- Full-text search on calls
ALTER TABLE portal_calls ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(caller_name, '') || ' ' ||
      COALESCE(caller_number, '') || ' ' ||
      COALESCE(summary_one_line, '') || ' ' ||
      COALESCE(ai_summary, '') || ' ' ||
      COALESCE(transcript_text, '')
    )
  ) STORED;
CREATE INDEX idx_portal_calls_search ON portal_calls USING gin(search_vector);
