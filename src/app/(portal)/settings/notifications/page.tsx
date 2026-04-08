"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface Preferences {
  missed_call_email: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  booking_confirmation: boolean;
  new_voicemail: boolean;
  billing_alerts: boolean;
}

const DEFAULT_PREFS: Preferences = {
  missed_call_email: true,
  daily_summary: true,
  weekly_report: true,
  booking_confirmation: true,
  new_voicemail: true,
  billing_alerts: true,
};

interface ToggleConfig {
  key: keyof Preferences;
  label: string;
  description: string;
}

const callToggles: ToggleConfig[] = [
  { key: "missed_call_email", label: "Missed call alerts", description: "Get notified when your agent misses a call or a caller hangs up before connecting." },
  { key: "new_voicemail", label: "New voicemail", description: "Get notified when a caller leaves a voicemail." },
  { key: "booking_confirmation", label: "Booking confirmations", description: "Get notified when your agent books an appointment on your behalf." },
];

const reportToggles: ToggleConfig[] = [
  { key: "daily_summary", label: "Daily summary", description: "A daily email with call stats, outcomes, and highlights from the previous day." },
  { key: "weekly_report", label: "Weekly performance report", description: "A weekly email with KPIs, trends, and agent performance metrics." },
];

const billingToggles: ToggleConfig[] = [
  { key: "billing_alerts", label: "Billing alerts", description: "Get notified about upcoming charges, payment failures, and usage thresholds." },
];

export default function NotificationsSettingsPage() {
  const { user } = useOrganization();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_notification_preferences")
        .select("preferences")
        .eq("user_id", user.id)
        .single();
      if (data?.preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.preferences as Partial<Preferences>) });
      }
    }
    load();
  }, [user.id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("portal_notification_preferences")
      .upsert({
        user_id: user.id,
        preferences: prefs,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      setMessage({ text: "Failed: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Notification preferences saved.", type: "success" });
    }
  }

  function Toggle({ toggle }: { toggle: ToggleConfig }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#242529]">{toggle.label}</p>
          <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{toggle.description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs[toggle.key]}
          onClick={() => setPrefs({ ...prefs, [toggle.key]: !prefs[toggle.key] })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            prefs[toggle.key] ? "bg-[#242529]" : "bg-[#eeeff1]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
              prefs[toggle.key] ? "translate-x-5 ml-0.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Delivery address */}
      <div className="pb-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Notification preferences</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Choose which notifications you receive. These settings apply to your account only.
        </p>

        <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-[#eeeff1] px-4 py-3">
          <Mail className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <div>
            <p className="text-[13px] text-[rgba(0,0,0,0.55)]">Notifications are sent to</p>
            <p className="text-[14px] font-medium text-[#242529]">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Call alerts */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Call alerts</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Real-time notifications about calls and bookings.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {callToggles.map((toggle) => (
            <Toggle key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Reports */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Reports & summaries</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Recurring email reports with performance data.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {reportToggles.map((toggle) => (
            <Toggle key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Billing */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Billing</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Payment and usage-related notifications.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {billingToggles.map((toggle) => (
            <Toggle key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      {message && (
        <p className={`mb-4 text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? "Saving..." : "Save preferences"}
      </Button>
    </div>
  );
}
