"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PhoneInput, formatPhone, toE164 } from "@/components/ui/phone-input";
import { ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof ShieldCheck }> = {
  not_started: { label: "Not started", variant: "secondary", icon: Clock },
  in_progress: { label: "In review", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

export default function VerificationSettingsPage() {
  const { organization } = useOrganization();
  const [status, setStatus] = useState("not_started");
  const [transactionalApproved, setTransactionalApproved] = useState(false);
  const [marketingApproved, setMarketingApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const isLocked = status === "approved";

  // Business info
  const [businessName, setBusinessName] = useState("");
  const [businessEin, setBusinessEin] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");

  // Primary contact
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_verification")
        .select("*")
        .eq("org_id", organization.id)
        .single();
      if (data) {
        setStatus(data.status);
        setBusinessName(data.business_name || "");
        setBusinessEin(data.business_ein || "");
        setBusinessAddress(data.business_address || "");
        setBusinessCategory(data.business_category || "");
        setContactFirstName(data.contact_first_name || "");
        setContactLastName(data.contact_last_name || "");
        setContactEmail(data.contact_email || "");
        setContactPhone(data.contact_phone ? formatPhone(data.contact_phone) : "");
        setTransactionalApproved(data.transactional_sms_approved);
        setMarketingApproved(data.marketing_sms_approved);
      }
    }
    load();
  }, [organization.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("portal_verification")
      .upsert({
        org_id: organization.id,
        status: "in_progress",
        business_name: businessName,
        business_ein: businessEin,
        business_address: businessAddress,
        business_category: businessCategory || null,
        contact_first_name: contactFirstName,
        contact_last_name: contactLastName || null,
        contact_email: contactEmail,
        contact_phone: toE164(contactPhone) || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "org_id" });

    setSaving(false);
    if (error) {
      setMessage({ text: "Failed: " + error.message, type: "error" });
    } else {
      setStatus("in_progress");
      setMessage({ text: "Verification submitted. We'll review your application shortly.", type: "success" });
    }
  }

  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-2xl">
      {/* Status banner */}
      <div className="pb-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#242529]">Business verification</h2>
            <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              Verification is required to enable SMS capabilities and ensure regulatory compliance.
            </p>
          </div>
          <Badge variant={statusInfo.variant} className="shrink-0 gap-1 text-[11px]">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* SMS capabilities status */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#eeeff1] px-4 py-3">
            <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Transactional SMS</p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${transactionalApproved ? "bg-emerald-500" : "bg-[rgba(0,0,0,0.2)]"}`} />
              <p className="text-[14px] font-medium text-[#242529]">
                {transactionalApproved ? "Approved" : "Pending"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#eeeff1] px-4 py-3">
            <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Marketing SMS</p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${marketingApproved ? "bg-emerald-500" : "bg-[rgba(0,0,0,0.2)]"}`} />
              <p className="text-[14px] font-medium text-[#242529]">
                {marketingApproved ? "Approved" : "Requires verification"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Business information */}
      <form onSubmit={handleSubmit}>
        <div className="py-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Business information</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
            Legal business details for identity verification.
          </p>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bizName" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  Business name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bizName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isLocked}
                  required
                  placeholder="Courtside AI Inc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ein" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  EIN / Tax ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ein"
                  value={businessEin}
                  onChange={(e) => setBusinessEin(e.target.value)}
                  disabled={isLocked}
                  required
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bizAddr" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                Business address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bizAddr"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                disabled={isLocked}
                required
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bizCat" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                Business category
              </Label>
              <Input
                id="bizCat"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                disabled={isLocked}
                placeholder="e.g., Professional Services, Healthcare, Legal"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-[#eeeff1]" />

        {/* Primary contact */}
        <div className="py-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Primary point of contact</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
            The person responsible for this account. Used for verification and compliance communications.
          </p>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cFirst" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  First name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cFirst"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                  disabled={isLocked}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cLast" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  Last name
                </Label>
                <Input
                  id="cLast"
                  value={contactLastName}
                  onChange={(e) => setContactLastName(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cEmail" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={isLocked}
                  required
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cPhone" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                  Phone
                </Label>
                <PhoneInput
                  id="cPhone"
                  value={contactPhone}
                  onChange={setContactPhone}
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        {!isLocked && (
          <div className="pb-10">
            {message && (
              <p className={`mb-4 text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                {message.text}
              </p>
            )}
            <Button type="submit" disabled={saving} size="sm">
              {saving ? "Submitting..." : status === "not_started" ? "Submit for verification" : "Resubmit"}
            </Button>
          </div>
        )}

        {isLocked && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-[14px] font-medium text-emerald-900">Verification approved</p>
              <p className="mt-0.5 text-[13px] text-emerald-700">
                Your business has been verified. Contact support if you need to update any information.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
