"use client";

import { TranscriptView } from "./transcript-view";
import { ActionsList } from "./actions-list";
import { useState } from "react";
import { PhoneIncoming, PhoneOutgoing, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime, formatDateDotTime } from "@/lib/date";
import { getOutcomeColor } from "@/lib/constants";
import { useOrganization } from "@/components/providers/org-provider";
import type { Call } from "@/lib/types";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPhoneNumber(phone: string | null): string {
  if (!phone) return "No number";
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10) {
    return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  return phone;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-[rgba(0,0,0,0.55)]">{label}</span>
      <span className="text-[13px] font-medium text-[#242529]">{children}</span>
    </div>
  );
}

function CopyableCallId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-[rgba(0,0,0,0.55)]">Call ID</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1]/60 hover:text-[rgba(0,0,0,0.55)]"
        title="Click to copy"
      >
        {id}
        {copied ? (
          <Check className="h-3 w-3 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

export function CallDetail({ call }: { call: Call }) {
  const { organization } = useOrganization();
  const tz = organization.timezone;
  const hasTranscript = call.transcript && call.transcript.length > 0;
  const hasActions = call.actions && call.actions.length > 0;
  const hasRecording = !!call.recording_url;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#242529] tracking-[-0.3px] leading-tight">
          {call.caller_name || call.contact?.first_name || formatPhoneNumber(call.caller_number) || "Unknown Caller"}
          {call.outcome_category && (
            <span className="font-normal text-[rgba(0,0,0,0.45)]"> — {call.outcome_category.name}</span>
          )}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[rgba(0,0,0,0.55)]">
          <span className="inline-flex items-center gap-1.5">
            {call.direction === "inbound" ? (
              <PhoneIncoming className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <PhoneOutgoing className="h-3.5 w-3.5 text-[rgba(0,0,0,0.35)]" />
            )}
            <span className="capitalize">{call.direction} call</span>
          </span>
          <span className="text-[rgba(0,0,0,0.2)]">·</span>
          <span className="whitespace-nowrap">
            {formatDateDotTime(call.started_at, tz)}
          </span>
          <span className="text-[rgba(0,0,0,0.2)]">·</span>
          <span className="whitespace-nowrap">
            {formatDuration(call.duration_seconds)}
          </span>
          {call.sentiment && (
            <>
              <span className="text-[rgba(0,0,0,0.2)]">·</span>
              <span
                className={cn(
                  call.sentiment === "positive" && "text-emerald-600",
                  call.sentiment === "negative" && "text-rose-500",
                  call.sentiment === "neutral" && "text-[rgba(0,0,0,0.55)]"
                )}
              >
                {call.sentiment}
              </span>
            </>
          )}
          {call.is_after_hours && (
            <>
              <span className="text-[rgba(0,0,0,0.2)]">·</span>
              <span className="text-amber-600">after hours</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main content */}
        <div className="space-y-0 lg:col-span-2">
          {/* Summary */}
          {(call.summary_one_line || call.ai_summary) && (
            <div className="pb-6">
              <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Summary</h2>
              {call.summary_one_line && (
                <p className="mt-2 text-[14px] font-medium text-[#242529]">{call.summary_one_line}</p>
              )}
              {call.ai_summary && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-[rgba(0,0,0,0.55)]">{call.ai_summary}</p>
              )}
            </div>
          )}

          {/* Recording */}
          {hasRecording && (
            <>
              <div className="h-px bg-[#eeeff1]" />
              <div className="py-6">
                <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Recording</h2>
                <div className="mt-3">
                  <audio controls className="w-full">
                    <source src={call.recording_url!} />
                  </audio>
                </div>
              </div>
            </>
          )}

          {/* Transcript */}
          {hasTranscript && (
            <>
              <div className="h-px bg-[#eeeff1]" />
              <div className="py-6">
                <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Transcript</h2>
                <div className="mt-3">
                  <TranscriptView entries={call.transcript || []} />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {hasActions && (
            <>
              <div className="h-px bg-[#eeeff1]" />
              <div className="py-6">
                <h2 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Actions Taken</h2>
                <div className="mt-3">
                  <ActionsList actions={call.actions || []} />
                </div>
              </div>
            </>
          )}

          {/* Empty state when no content below summary */}
          {!hasRecording && !hasTranscript && !hasActions && (
            <>
              <div className="h-px bg-[#eeeff1]" />
              <div className="py-6">
                <p className="text-[13px] text-[rgba(0,0,0,0.35)]">No recording, transcript, or actions available for this call.</p>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Call Info */}
          <div className="rounded-[10px] border border-[#eeeff1] px-4 py-4 sm:px-5">
            <h3 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Call Info</h3>
            <div className="mt-3 divide-y divide-[#eeeff1]/60">
              <InfoRow label="Date">{formatDate(call.started_at, tz)}</InfoRow>
              <InfoRow label="Time">{formatTime(call.started_at, tz)}</InfoRow>
              <InfoRow label="Duration">{formatDuration(call.duration_seconds)}</InfoRow>
              {call.latency_avg_ms && (
                <InfoRow label="Avg Latency">{call.latency_avg_ms}ms</InfoRow>
              )}
              <InfoRow label="Agent">{call.agent?.name || "—"}</InfoRow>
              {call.outcome_category && (
                <InfoRow label="Outcome">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium text-white"
                    style={{ backgroundColor: getOutcomeColor(call.outcome_category) }}
                  >
                    {call.outcome_category.name}
                  </span>
                </InfoRow>
              )}
              {call.outcome_confidence && (
                <InfoRow label="Confidence">{Math.round(call.outcome_confidence * 100)}%</InfoRow>
              )}
              <CopyableCallId id={call.id} />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-[10px] border border-[#eeeff1] px-4 py-4 sm:px-5">
            <h3 className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">Contact</h3>
            <div className="mt-3">
              <p className="text-[14px] font-medium text-[#242529]">
                {call.caller_name || call.contact?.first_name || "Unknown"}
                {call.contact?.last_name && ` ${call.contact.last_name}`}
              </p>
              <p className="mt-0.5 text-[13px] text-[rgba(0,0,0,0.55)]">
                {formatPhoneNumber(call.caller_number)}
              </p>
              {call.contact && (
                <p className="mt-1 text-[12px] text-[rgba(0,0,0,0.35)]">
                  {call.contact.total_calls} total call{call.contact.total_calls !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
