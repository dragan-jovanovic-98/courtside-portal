export type PortalUserRole = "owner" | "admin" | "member" | "viewer" | "super_admin";
export type CallDirection = "inbound" | "outbound";
export type CallStatus = "completed" | "missed" | "voicemail" | "abandoned" | "transferred";
export type AgentStatus = "active" | "pending" | "inactive";
export type BookingStatus = "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  business_type: string | null;
  logo_url: string | null;
  business_phone: string | null;
  website: string | null;
  address: string | null;
  country: string;
  timezone: string;
  business_hours: BusinessHours;
  primary_email: string | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  conversion_metric_label: string;
  average_order_value: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  rules: Array<{
    start: string;
    end: string;
    days: number[];
  }>;
}

export interface PortalUser {
  id: string;
  auth_id: string;
  org_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  timezone: string;
  role: PortalUserRole;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  org_id: string;
  name: string;
  agent_type: string;
  direction: CallDirection;
  status: AgentStatus;
  phone_number_id: string | null;
  livekit_agent_id: string | null;
  llm_provider: string;
  llm_model: string;
  voice_id: string | null;
  voice_gender: string;
  system_prompt: string | null;
  purpose_description: string | null;
  preferred_greeting: string | null;
  tools_config: unknown[];
  additional_notes: string | null;
  total_calls: number;
  total_bookings: number;
  booking_rate: number;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  org_id: string;
  twilio_sid: string | null;
  number: string;
  friendly_name: string | null;
  type: string;
  agent_id: string | null;
  status: string;
  total_calls_handled: number;
  total_texts_sent: number;
  created_at: string;
}

export interface OutcomeCategory {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  close_likelihood: number;
  created_at: string;
}

export interface Call {
  id: string;
  org_id: string;
  agent_id: string | null;
  contact_id: string | null;
  direction: CallDirection;
  status: CallStatus;
  outcome_category_id: string | null;
  caller_number: string | null;
  caller_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_after_hours: boolean;
  sentiment: Sentiment | null;
  sentiment_score: number | null;
  engagement_level: string | null;
  outcome_confidence: number | null;
  ai_summary: string | null;
  summary_one_line: string | null;
  transcript: TranscriptEntry[] | null;
  transcript_text: string | null;
  recording_url: string | null;
  livekit_room_id: string | null;
  twilio_call_sid: string | null;
  latency_avg_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined fields
  agent?: Agent;
  outcome_category?: OutcomeCategory;
  contact?: Contact;
  actions?: CallAction[];
}

export interface TranscriptEntry {
  role: "agent" | "caller";
  content: string;
  timestamp: string;
}

export interface CallAction {
  id: string;
  call_id: string;
  org_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  org_id: string;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  first_call_id: string | null;
  total_calls: number;
  last_call_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  org_id: string;
  call_id: string | null;
  agent_id: string | null;
  contact_id: string | null;
  user_id: string | null;
  title: string | null;
  description: string | null;
  service_type: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  notes: string | null;
  calendar_connection_id: string | null;
  calendar_provider: string | null;
  calendar_event_id: string | null;
  calendar_synced_at: string | null;
  sync_status: string;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  agent?: Agent;
  contact?: Contact;
}

export interface Plan {
  id: string;
  org_id: string | null;
  name: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  monthly_base_price_cents: number;
  included_minutes: number;
  overage_per_minute_cents: number;
  setup_fee_cents: number;
  setup_fee_covers_days: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  org_id: string;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  plan_name: string | null;
  price_monthly: number | null;
  call_minutes_limit: number;
  call_minutes_used: number;
  phone_numbers_limit: number;
  phone_numbers_used: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  currency: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  created_at_stripe: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_org_id: string;
  referral_code: string;
  referred_org_id: string | null;
  status: "pending" | "signed_up" | "rewarded";
  created_at: string;
}
