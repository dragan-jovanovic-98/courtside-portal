export type PortalUserRole = "owner" | "admin" | "member" | "viewer" | "super_admin";
export type CallDirection = "inbound" | "outbound";
export type CallStatus = "completed" | "missed" | "voicemail" | "abandoned" | "transferred";
export type AgentStatus = "active" | "pending" | "inactive";
export type AgentRole = "router" | "specialist" | "after_hours" | "general";
export type BookingStatus = "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";
export type Sentiment = "positive" | "neutral" | "negative";
export type IntentType = "sales" | "service" | "commercial" | "claim" | "wrong_number" | "other";
export type LineOfBusiness = "auto" | "home" | "life" | "health" | "commercial" | "specialty" | "unknown";
export type AnalysisStatus = "pending" | "processing" | "done" | "failed" | "skipped";
export type CommitmentType = "callback" | "appointment" | "transfer" | "confirmation";
export type CommitmentStatus = "pending" | "delivered" | "kept" | "missed" | "cancelled";

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
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  default_recording_disclosure_id: string | null;
  broker_notification_rule: BrokerNotificationRule;
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
  /** @deprecated Phase C migrates to Retell. Future cleanup migration drops this column. */
  livekit_agent_id: string | null;
  retell_agent_id: string | null;
  role: AgentRole;
  intake_schema: IntakeSchema;
  post_call_webhook_url: string | null;
  active_hours: ActiveHours | null;
  recording_disclosure_id: string | null;
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

/**
 * Per-agent intake schema. Drives the post-call analyzer's structured-extraction prompt.
 * V1 shape: a list of fields the analyzer should attempt to extract from the transcript
 * (when not already captured by a tool call).
 */
export interface IntakeSchema {
  fields?: Array<{
    field_name: string;
    field_type: "string" | "number" | "boolean" | "date" | "phone" | "email";
    required?: boolean;
    description?: string;
  }>;
}

/**
 * Per-agent active hours. Used to gate routing (router → after_hours agent at night, etc.).
 * Reuses the same shape as portal_organizations.business_hours.
 */
export type ActiveHours = BusinessHours;

export interface PhoneNumber {
  id: string;
  org_id: string;
  twilio_sid: string | null;
  retell_phone_id: string | null;
  owned_by_court_side: boolean;
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
  intent_type: IntentType | null;
  line_of_business: LineOfBusiness | null;
  caller_number: string | null;
  caller_name: string | null;
  to_number: string | null;
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
  recording_multi_channel_url: string | null;
  public_log_url: string | null;
  knowledge_base_retrieved_url: string | null;
  livekit_room_id: string | null;
  twilio_call_sid: string | null;
  latency_avg_ms: number | null;
  latency_metrics: RetellLatencyMetrics | null;
  metadata: Record<string, unknown>;
  // Phase C: analysis state
  analysis_status: AnalysisStatus;
  analysis_attempted_at: string | null;
  analysis_error: string | null;
  analysis_retry_count: number;
  // Phase C: Retell identifiers
  retell_call_id: string | null;
  retell_agent_version: number | null;
  retell_agent_name: string | null;
  disconnection_reason: string | null;
  retell_dynamic_variables: Record<string, unknown> | null;
  retell_collected_variables: Record<string, unknown> | null;
  // Phase C: Retell's own call_analysis baseline
  retell_call_summary: string | null;
  retell_user_sentiment: string | null;
  retell_call_successful: boolean | null;
  retell_in_voicemail: boolean | null;
  retell_custom_analysis_data: Record<string, unknown> | null;
  // Phase C: tool calls
  tool_calls: RetellToolCall[] | null;
  tool_call_count: number;
  // Phase C: cost tracking
  retell_cost_cents: number | null;
  retell_cost_breakdown: RetellCallCost["product_costs"] | null;
  analysis_cost_cents: number | null;
  analysis_token_usage: { prompt: number; completion: number; model: string } | null;
  // Phase C: disclosure
  recording_disclosure_id: string | null;
  created_at: string;
  // Joined fields
  agent?: Agent;
  outcome_category?: OutcomeCategory;
  contact?: Contact;
  actions?: CallAction[];
  commitments?: Commitment[];
  recording_disclosure?: RecordingDisclosure;
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
  assigned_broker_id: string | null;
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

// ============================================================
// Phase C — Commitments, recording disclosures, calendar groups
// ============================================================

export interface Commitment {
  id: string;
  org_id: string;
  call_id: string | null;
  retell_call_id: string | null;
  broker_id: string | null;
  contact_id: string | null;
  type: CommitmentType;
  scheduled_for: string | null;
  callback_window_start: string | null;
  callback_window_end: string | null;
  commitment_text: string;
  intake_summary: string | null;
  intake_data: Record<string, unknown> | null;
  status: CommitmentStatus;
  delivery_log: CommitmentDeliveryLogEntry[];
  created_via_tool: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  call?: Call;
  contact?: Contact;
  broker?: PortalUser;
}

export interface CommitmentDeliveryLogEntry {
  channel: "email" | "sms_to_caller" | "sms_to_broker" | "calendar_gcal" | "calendar_outlook" | "portal_queue";
  status: "pending" | "sent" | "success" | "failed" | "skipped";
  recipient?: string;
  reason?: string;
  attempted_at: string;
  message_id?: string;
  error?: string;
}

export interface RecordingDisclosure {
  id: string;
  jurisdiction: string;
  language: string;
  body_text: string;
  version: number;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarGroup {
  id: string;
  org_id: string;
  name: string;
  routing_strategy: "round_robin" | "content_match" | "priority";
  config: Record<string, unknown>;
  created_at: string;
}

export interface CalendarGroupMembership {
  id: string;
  group_id: string;
  calendar_connection_id: string;
  priority: number | null;
  created_at: string;
}

/**
 * Stored under portal_notification_preferences.preferences for each portal_user.
 * Drives whether the broker receives email/SMS/portal/calendar deliveries on commitments.
 */
export interface BrokerNotificationPreferences {
  commitment_email: boolean;
  commitment_portal: boolean;
  commitment_sms: boolean;
  commitment_calendar: boolean;
}

/**
 * Stored on portal_organizations.broker_notification_rule.
 * `subscribe_to`: which events trigger notifications to the org-level subscribers.
 * `subscriber_user_ids`: portal_users.id list — typically brokerage owner(s) / managers
 * who want copies of every-call or commitment-only notifications regardless of
 * which broker was assigned.
 */
export interface BrokerNotificationRule {
  subscribe_to: "every_call" | "commitment_only" | { intent_types: IntentType[] };
  subscriber_user_ids: string[];
}

// ============================================================
// Phase C — Retell webhook payload shapes
// ============================================================

export interface RetellToolCall {
  tool_call_id: string;
  name: string;
  type: string;
  start_time_sec?: number;
  arguments?: string;
}

export interface RetellCallCost {
  product_costs: Array<{
    product: string;
    unit_price?: number;
    cost: number;
  }>;
  total_duration_seconds?: number;
  total_duration_unit_price?: number;
  combined_cost: number;
}

export interface RetellLatencyBucket {
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  min?: number;
  max?: number;
  num?: number;
  sum?: number;
  values?: number[];
}

export interface RetellLatencyMetrics {
  llm?: RetellLatencyBucket;
  e2e?: RetellLatencyBucket;
  tts?: RetellLatencyBucket;
  knowledge_base?: RetellLatencyBucket;
  asr?: RetellLatencyBucket;
}

export interface RetellCallAnalysis {
  call_summary: string | null;
  in_voicemail: boolean | null;
  user_sentiment: string | null;
  call_successful: boolean | null;
  custom_analysis_data: Record<string, unknown> | null;
}

// ============================================================
// Phase C — Call analysis attempt log
// ============================================================

export interface CallAnalysisAttempt {
  id: string;
  call_id: string;
  status: AnalysisStatus;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  prompt_token_count: number | null;
  completion_token_count: number | null;
  model: string | null;
}
