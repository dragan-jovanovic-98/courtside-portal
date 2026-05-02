"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { hasAdminPrivileges } from "@/lib/permissions";

interface ComplianceToggle {
  key: string;
  label: string;
  description: string;
  value: boolean;
  setter: (v: boolean) => void;
}

export default function ComplianceSettingsPage() {
  const { organization, user } = useOrganization();
  const canEdit = hasAdminPrivileges(user.role);

  // SMS compliance
  const [autoSmsStop, setAutoSmsStop] = useState(true);
  const [autoVerbalDnc, setAutoVerbalDnc] = useState(true);
  const [nationalDncCheck, setNationalDncCheck] = useState(true);

  // Call compliance
  const [callRecordingConsent, setCallRecordingConsent] = useState(true);
  const [callRecordingNotice, setCallRecordingNotice] = useState(true);

  // Data
  const [autoDeleteTranscripts, setAutoDeleteTranscripts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_compliance_settings")
        .select("*")
        .eq("org_id", organization.id)
        .single();
      if (data) {
        setAutoSmsStop(data.auto_sms_stop);
        setAutoVerbalDnc(data.auto_verbal_dnc);
        setNationalDncCheck(data.national_dnc_check);
        if (data.call_recording_consent !== undefined) setCallRecordingConsent(data.call_recording_consent);
        if (data.call_recording_notice !== undefined) setCallRecordingNotice(data.call_recording_notice);
        if (data.auto_delete_transcripts !== undefined) setAutoDeleteTranscripts(data.auto_delete_transcripts);
      }
    }
    load();
  }, [organization.id]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("portal_compliance_settings")
      .update({
        auto_sms_stop: autoSmsStop,
        auto_verbal_dnc: autoVerbalDnc,
        national_dnc_check: nationalDncCheck,
        call_recording_consent: callRecordingConsent,
        call_recording_notice: callRecordingNotice,
        auto_delete_transcripts: autoDeleteTranscripts,
      })
      .eq("org_id", organization.id);
    setSaving(false);
    if (error) {
      setMessage({ text: "Failed: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Compliance settings saved.", type: "success" });
    }
  }

  const smsToggles: ComplianceToggle[] = [
    {
      key: "autoSmsStop",
      label: "Auto-honor SMS STOP keywords",
      description: "Automatically stop texting when a contact replies STOP, UNSUBSCRIBE, or CANCEL.",
      value: autoSmsStop,
      setter: setAutoSmsStop,
    },
    {
      key: "autoVerbalDnc",
      label: "Auto-honor verbal DNC requests",
      description: "Add callers to the Do Not Call list when they verbally request it during a call.",
      value: autoVerbalDnc,
      setter: setAutoVerbalDnc,
    },
    {
      key: "nationalDncCheck",
      label: "National DNC list check",
      description: "Check numbers against the national Do Not Call registry before outbound calls.",
      value: nationalDncCheck,
      setter: setNationalDncCheck,
    },
  ];

  const callToggles: ComplianceToggle[] = [
    {
      key: "callRecordingConsent",
      label: "Call recording consent",
      description: "Require verbal consent before recording calls. Required in two-party consent states.",
      value: callRecordingConsent,
      setter: setCallRecordingConsent,
    },
    {
      key: "callRecordingNotice",
      label: "Call recording disclosure",
      description: "Agent announces that the call may be recorded at the start of each conversation.",
      value: callRecordingNotice,
      setter: setCallRecordingNotice,
    },
  ];

  const dataToggles: ComplianceToggle[] = [
    {
      key: "autoDeleteTranscripts",
      label: "Auto-delete transcripts after 90 days",
      description: "Automatically remove call transcripts and recordings after 90 days to reduce data retention.",
      value: autoDeleteTranscripts,
      setter: setAutoDeleteTranscripts,
    },
  ];

  function ToggleRow({ toggle }: { toggle: ComplianceToggle }) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#242529]">{toggle.label}</p>
          <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{toggle.description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={toggle.value}
          onClick={() => canEdit && toggle.setter(!toggle.value)}
          disabled={!canEdit}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            toggle.value ? "bg-[#242529]" : "bg-[#eeeff1]"
          } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
              toggle.value ? "translate-x-5 ml-0.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* SMS compliance */}
      <div className="pb-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">SMS & texting compliance</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Controls for how your AI agents handle SMS opt-outs and Do Not Call requests.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {smsToggles.map((toggle) => (
            <ToggleRow key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Call recording compliance */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Call recording</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Recording consent and disclosure settings. Requirements vary by state — consult your legal team.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {callToggles.map((toggle) => (
            <ToggleRow key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Data retention */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Data retention</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Control how long call data and transcripts are stored.
        </p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {dataToggles.map((toggle) => (
            <ToggleRow key={toggle.key} toggle={toggle} />
          ))}
        </div>
      </div>

      {message && (
        <p className={`text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      )}

      <div className="h-px bg-[#eeeff1] mt-10" />

      {/* Verification callout */}
      <div className="py-10">
        <div className="flex items-start gap-3 rounded-lg border border-[#eeeff1] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[#242529]">Business verification</p>
            <p className="mt-0.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              SMS capabilities require business verification. Complete your verification to enable transactional and marketing messages.
            </p>
          </div>
          <Link
            href="/settings/verification"
            className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[#242529] hover:underline"
          >
            Verify
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
