export const APP_NAME = "Client Portal";
export const COMPANY_NAME = "Courtside AI";

export const SENTIMENT_LABELS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  positive: { label: "Positive", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  neutral: { label: "Neutral", color: "text-zinc-600", bg: "bg-zinc-100", dot: "bg-zinc-400" },
  negative: { label: "Negative", color: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500" },
};

export const SENTIMENT_ICONS: Record<string, string> = {
  positive: "😊",
  neutral: "😐",
  negative: "😟",
};

export const ENGAGEMENT_LEVELS = ["high", "medium", "low", "disengaged"] as const;

export const IMPACT_TIER_COLORS: Record<string, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-zinc-400",
};

// Default color for outcomes when no custom color is set, keyed by impact tier
export const DEFAULT_OUTCOME_COLORS: Record<string, string> = {
  high: "#242529",
  medium: "#d97706",
  low: "#d4d4d8",
};

// Preset color palette for outcome category picker
export const OUTCOME_COLOR_PRESETS = [
  { value: "#242529", label: "Black" },
  { value: "#d97706", label: "Amber" },
  { value: "#d4d4d8", label: "Gray" },
  { value: "#2563eb", label: "Blue" },
  { value: "#059669", label: "Emerald" },
  { value: "#dc2626", label: "Red" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#ea580c", label: "Orange" },
  { value: "#65a30d", label: "Lime" },
] as const;

export function getOutcomeColor(category: { color?: string | null; impact_tier?: string }): string {
  return category.color || DEFAULT_OUTCOME_COLORS[category.impact_tier ?? "low"] || "#d4d4d8";
}

export const CHART_COLORS = {
  highImpact: "#10b981",    // emerald-500
  mediumImpact: "#f59e0b",  // amber-500
  lowImpact: "#d4d4d8",     // zinc-300
  inbound: "#18181b",       // zinc-900 — primary bar color
  afterHours: "#71717a",    // zinc-500
  businessHours: "#18181b", // zinc-900
  positive: "#10b981",      // emerald-500
  neutral: "#a1a1aa",       // zinc-400
  negative: "#ef4444",      // red-500
} as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Call Logs", href: "/calls", icon: "Phone" },
  { label: "Bookings", href: "/bookings", icon: "Calendar" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
  { label: "Settings", href: "/settings", icon: "Settings" },
  { label: "Referrals", href: "/referrals", icon: "Gift" },
] as const;

export const INDUSTRIES = [
  { value: "sports", label: "Sports & Recreation" },
  { value: "legal", label: "Legal" },
  { value: "medical", label: "Medical" },
  { value: "dental", label: "Dental" },
  { value: "home_services", label: "Home Services" },
  { value: "real_estate", label: "Real Estate" },
  { value: "hospitality", label: "Hospitality" },
  { value: "automotive", label: "Automotive" },
  { value: "other", label: "Other" },
] as const;

export const DATE_RANGE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "180d", value: "180d" },
] as const;
