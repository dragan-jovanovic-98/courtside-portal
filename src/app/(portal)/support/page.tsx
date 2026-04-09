"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageSquare,
  CreditCard,
  Settings,
  Phone,
  Calendar,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing & payments" },
  { value: "agent", label: "AI agent issue" },
  { value: "calls", label: "Call quality or logs" },
  { value: "bookings", label: "Bookings & calendar" },
  { value: "account", label: "Account & access" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
];

const FAQ_ITEMS = [
  {
    question: "How does the AI agent handle calls?",
    answer: "Your AI agent answers inbound calls automatically using natural language processing. It can take messages, book appointments, handle FAQs, and route urgent calls — all based on the system prompt and configuration you set in Settings > AI Agents.",
  },
  {
    question: "What do the call outcome categories mean?",
    answer: "Outcome categories classify each call result (e.g., Appointment Booked, Message Taken, Quote Request). Each category has an impact tier and close likelihood used to calculate estimated revenue impact. You can customize these in Settings > Organization.",
  },
  {
    question: "How does billing work?",
    answer: "Billing is based on your subscription plan and usage (call minutes, phone numbers). You can view your current usage, invoices, and manage your subscription from the Billing page or Settings > Billing & Payment.",
  },
  {
    question: "How do I add or manage team members?",
    answer: "Go to Settings > Team to invite new members by email. You can assign roles: Viewers can see the dashboard and calls, Members can also manage referrals, and Admins have full access to all settings.",
  },
  {
    question: "Why do I need business verification?",
    answer: "Business verification is required to enable SMS capabilities (appointment confirmations, follow-ups). It ensures regulatory compliance with carrier requirements. Complete your verification in Settings > Verification.",
  },
  {
    question: "How do I connect my calendar?",
    answer: "Go to Settings > Integrations and click Connect next to Google Calendar. Once connected, bookings made by your AI agent will automatically appear on your calendar.",
  },
];

const QUICK_LINKS = [
  { label: "Billing dashboard", href: "/billing", icon: CreditCard },
  { label: "AI agent settings", href: "/settings/agents", icon: Phone },
  { label: "Calendar integration", href: "/settings/integrations", icon: Calendar },
  { label: "Account settings", href: "/settings/account", icon: Settings },
  { label: "Business verification", href: "/settings/verification", icon: ShieldCheck },
];

export default function SupportPage() {
  const { organization, user } = useOrganization();
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const supabase = createClient();
    const { error } = await supabase.from("portal_support_requests").insert({
      org_id: organization.id,
      user_id: user.id,
      subject,
      message: messageText,
      category,
    });

    setSending(false);
    if (error) {
      setResult({ text: "Failed to send: " + error.message, type: "error" });
    } else {
      setResult({ text: "Your request has been submitted. We'll get back to you shortly.", type: "success" });
      setSubject("");
      setMessageText("");
      setCategory("general");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[20px] font-semibold text-[#242529] tracking-[-0.3px]">Help & Support</h1>
        <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
          Find answers to common questions or get in touch with our team.
        </p>
      </div>

      {/* Quick links */}
      <div className="pb-8">
        <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Quick links</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 rounded-[10px] border border-[#eeeff1] px-3 py-2.5 text-[13px] font-medium text-[#242529] transition-colors hover:bg-[#f8f9fa]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* FAQ */}
      <div className="py-8">
        <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Frequently asked questions</h2>
        <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Common questions about the platform.</p>

        <div className="mt-5 divide-y divide-[#eeeff1]/60">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index}>
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="flex w-full items-center justify-between py-3.5 text-left"
              >
                <span className="text-[14px] font-medium text-[#242529]">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)] transition-transform ${
                    expandedFaq === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedFaq === index && (
                <p className="pb-4 text-[13px] leading-relaxed text-[rgba(0,0,0,0.55)]">
                  {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Contact form */}
      <div className="py-8">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <div>
            <h2 className="text-[14px] font-medium text-[#242529]">Contact us</h2>
            <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
              Can&apos;t find what you need? Send us a message and we&apos;ll get back to you within one business day.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="supportSubject" className="text-[13px] text-[rgba(0,0,0,0.55)]">Subject</Label>
              <Input
                id="supportSubject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Brief description of your issue"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Category</Label>
              <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {CATEGORIES.find((c) => c.value === category)?.label ?? category}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supportMessage" className="text-[13px] text-[rgba(0,0,0,0.55)]">Message</Label>
            <Textarea
              id="supportMessage"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              required
              rows={4}
              placeholder="Describe your issue or question in detail..."
            />
          </div>

          {result && (
            <p className={`text-[13px] ${result.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {result.text}
            </p>
          )}

          <Button type="submit" disabled={sending} size="sm">
            {sending ? "Sending..." : "Send message"}
          </Button>
        </form>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Direct contact */}
      <div className="py-8">
        <div className="flex items-center gap-3 rounded-[10px] border border-[#eeeff1] px-4 py-3.5">
          <Mail className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.35)]" />
          <div>
            <p className="text-[13px] text-[rgba(0,0,0,0.55)]">You can also reach us directly at</p>
            <a href="mailto:support@court-side.ai" className="text-[14px] font-medium text-[#242529] hover:underline">
              support@court-side.ai
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
