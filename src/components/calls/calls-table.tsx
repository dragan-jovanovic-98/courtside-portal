"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronLeft, ChevronRight, PhoneIncoming, PhoneOutgoing, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import { SENTIMENT_LABELS, getOutcomeColor } from "@/lib/constants";
import type { Call } from "@/lib/types";

interface CallsTableProps {
  calls: Call[];
  total: number;
  page: number;
  perPage: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPhone(raw: string | null): string {
  if (!raw) return "Unknown";
  // Strip to digits only
  const digits = raw.replace(/\D/g, "");
  // US/CAN: 10 or 11 digits (with leading 1)
  const d = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return raw;
}

const cols = "150px 95px 190px 160px 100px 105px 1fr";
const emptyDash = "text-[14px] text-[rgba(0,0,0,0.25)]";
const cellBase = "flex items-center px-3 border-r border-[#eeeff1] truncate";
const cellLast = "flex items-center px-3 truncate";
const headerText = "text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]";

export function CallsTable({ calls, total, page, perPage }: CallsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const tz = organization.timezone;
  const totalPages = Math.ceil(total / perPage);

  function toggleSort(column: string) {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get("sort");
    const currentOrder = params.get("order");

    if (currentSort === column && currentOrder !== "asc") {
      params.set("order", "asc");
    } else {
      params.set("sort", column);
      params.delete("order");
    }
    router.push(`?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p.toString());
    router.push(`?${params.toString()}`);
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white">
        <div className="flex flex-col items-center justify-center py-16">
          <Phone className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No calls found</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Try adjusting your filters or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#eeeff1] bg-white overflow-hidden">
        {/* Header */}
        <div
          className="grid border-b border-[#eeeff1]"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={cn(cellBase, headerText, "h-10")}>
            <button onClick={() => toggleSort("started_at")} className="inline-flex items-center gap-1.5 uppercase">
              Date / Time <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className={cn(cellBase, headerText, "h-10")}>
            <button onClick={() => toggleSort("duration_seconds")} className="inline-flex items-center gap-1.5 uppercase">
              Duration <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className={cn(cellBase, headerText, "h-10")}>Caller</div>
          <div className={cn(cellBase, headerText, "h-10")}>Outcome</div>
          <div className={cn(cellBase, headerText, "h-10")}>Agent</div>
          <div className={cn(cellBase, headerText, "h-10")}>Sentiment</div>
          <div className={cn(cellLast, headerText, "h-10")}>Summary</div>
        </div>

        {/* Rows */}
        {calls.map((call, i) => (
          <div
            key={call.id}
            className={cn(
              "grid group cursor-pointer transition-colors hover:bg-[#f8f9fa]",
              i < calls.length - 1 && "border-b border-[#eeeff1]"
            )}
            style={{ gridTemplateColumns: cols, height: 36 }}
            onClick={() => router.push(`/calls/${call.id}`)}
          >
            <div className={cn(cellBase, "text-[14px] font-medium text-[#242529]")}>
              {formatDateTime(call.started_at, tz)}
            </div>

            <div className={cn(cellBase, "text-[14px] text-[#242529] tabular-nums")}>
              {formatDuration(call.duration_seconds)}
            </div>

            <div className={cn(cellBase, "text-[14px] text-[#242529] gap-2")}>
              {call.direction === "inbound" ? (
                <PhoneIncoming className="h-[14px] w-[14px] shrink-0 text-emerald-600" />
              ) : (
                <PhoneOutgoing className="h-[14px] w-[14px] shrink-0 text-[rgba(0,0,0,0.3)]" />
              )}
              <span className="truncate">{formatPhone(call.caller_number)}</span>
            </div>

            <div className={cn(cellBase)}>
              {call.outcome_category ? (
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium text-white"
                  style={{ backgroundColor: getOutcomeColor(call.outcome_category) }}
                >
                  {call.outcome_category.name}
                </span>
              ) : (
                <span className={emptyDash}>—</span>
              )}
            </div>

            <div className={cn(cellBase, "text-[14px] text-[#242529]")}>
              <span className="truncate">{call.agent?.name || <span className={emptyDash}>—</span>}</span>
            </div>

            <div className={cn(cellBase)}>
              {call.sentiment && SENTIMENT_LABELS[call.sentiment] ? (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium",
                  SENTIMENT_LABELS[call.sentiment].bg,
                  SENTIMENT_LABELS[call.sentiment].color
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", SENTIMENT_LABELS[call.sentiment].dot)} />
                  {SENTIMENT_LABELS[call.sentiment].label}
                </span>
              ) : (
                <span className={emptyDash}>—</span>
              )}
            </div>

            <div className={cn(cellLast, "text-[14px] text-[rgba(0,0,0,0.5)] justify-between")}>
              <span className="truncate">{call.summary_one_line || "—"}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.25)] opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[rgba(0,0,0,0.45)]">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium bg-white border border-[#e5e5e5] text-[#525866] hover:bg-[#f8f9fa] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="text-[13px] font-medium text-[rgba(0,0,0,0.45)] tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium bg-white border border-[#e5e5e5] text-[#525866] hover:bg-[#f8f9fa] transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
