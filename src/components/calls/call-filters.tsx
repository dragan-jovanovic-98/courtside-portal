"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { CalendarIcon, SlidersHorizontal, X, Check, ChevronLeft } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import type { Agent, OutcomeCategory } from "@/lib/types";
import type { DateRange } from "react-day-picker";

interface CallFiltersProps {
  agents: Agent[];
  outcomes: OutcomeCategory[];
}

const btnBase = "flex items-center gap-2 h-9 px-3 rounded-lg text-[14px] font-medium transition-colors cursor-pointer";
const btnOutline = `${btnBase} bg-white border border-[#e5e5e5] text-[#525866] hover:bg-[#f8f9fa]`;
const chipBase = "flex items-center gap-2 h-9 px-2.5 rounded-lg bg-[#f5f7fa] text-[14px]";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, handler, active]);
}

export function CallFilters({ agents, outcomes }: CallFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Date range state
  const [dateOpen, setDateOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const dateRef = useRef<HTMLDivElement>(null);
  useClickOutside(dateRef, useCallback(() => setDateOpen(false), []), dateOpen);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPage, setFilterPage] = useState<string | null>(null); // null = category list, string = category key
  const [pendingSelections, setPendingSelections] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);
  useClickOutside(filterRef, useCallback(() => { setFilterOpen(false); setFilterPage(null); }, []), filterOpen);

  const activeRange = searchParams.get("range");
  const activeFilterKeys = ["direction", "status", "sentiment", "agent", "outcome", "hours", "duration_min", "duration_max"].filter(
    (f) => searchParams.get(f)
  );

  const filterDefs = [
    { key: "status", label: "Status", options: [
      { value: "completed", label: "Completed" },
      { value: "missed", label: "Missed" },
      { value: "voicemail", label: "Voicemail" },
      { value: "abandoned", label: "Abandoned" },
      { value: "transferred", label: "Transferred" },
    ]},
    { key: "direction", label: "Direction", options: [
      { value: "inbound", label: "Inbound" },
      { value: "outbound", label: "Outbound" },
    ]},
    { key: "sentiment", label: "Sentiment", options: [
      { value: "positive", label: "Positive" },
      { value: "neutral", label: "Neutral" },
      { value: "negative", label: "Negative" },
    ]},
    { key: "agent", label: "Agent", options: agents.map(a => ({ value: a.id, label: a.name })) },
    { key: "outcome", label: "Outcome", options: outcomes.map(o => ({ value: o.id, label: o.name })) },
    { key: "hours", label: "Hours", options: [
      { value: "business", label: "Business Hours" },
      { value: "after", label: "After Hours" },
    ]},
    { key: "duration", label: "Duration", options: [] },
  ];

  // --- Date range ---
  function applyDateRange() {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`);
    setDateOpen(false);
  }

  function removeDateFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("range");
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
  }

  const dateLabel = activeRange === "custom" && searchParams.get("from") && searchParams.get("to")
    ? searchParams.get("from") === searchParams.get("to")
      ? format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")
      : `${format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")} – ${format(new Date(searchParams.get("to")! + "T00:00"), "MMM d")}`
    : null;

  // --- Filters ---
  function openFilterCategory(key: string) {
    setFilterPage(key);
    if (key === "duration") {
      setDurationMin(searchParams.get("duration_min") ?? "");
      setDurationMax(searchParams.get("duration_max") ?? "");
    } else {
      // Load current selections
      const current = searchParams.get(key);
      setPendingSelections(current ? current.split(",") : []);
    }
  }

  function toggleSelection(value: string) {
    setPendingSelections(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  function applyFilter() {
    const params = new URLSearchParams(searchParams.toString());
    if (filterPage === "duration") {
      if (durationMin) params.set("duration_min", durationMin); else params.delete("duration_min");
      if (durationMax) params.set("duration_max", durationMax); else params.delete("duration_max");
    } else if (filterPage) {
      if (pendingSelections.length > 0) {
        params.set(filterPage, pendingSelections.join(","));
      } else {
        params.delete(filterPage);
      }
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
    setFilterOpen(false);
    setFilterPage(null);
  }

  function cancelFilter() {
    setFilterPage(null);
    if (!filterPage) setFilterOpen(false);
  }

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  function getFilterDisplay(key: string): { label: string; value: string } {
    const def = filterDefs.find(f => f.key === key);
    const rawValue = searchParams.get(key)!;
    const values = rawValue.split(",");
    const labels = values.map(v => def?.options.find(o => o.value === v)?.label ?? v);
    return { label: def?.label ?? key, value: labels.join(", ") };
  }

  function getDurationDisplay(): string | null {
    const min = searchParams.get("duration_min");
    const max = searchParams.get("duration_max");
    if (!min && !max) return null;
    if (min && max) return `${min}s – ${max}s`;
    if (min) return `≥ ${min}s`;
    return `≤ ${max}s`;
  }

  const durationDisplay = getDurationDisplay();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <div className="relative" ref={dateRef}>
        <button
          onClick={() => { setDateOpen(!dateOpen); setFilterOpen(false); }}
          className={btnOutline}
        >
          <CalendarIcon className="h-4 w-4" />
          Date Range
        </button>
        {dateOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
            <div className="flex gap-2 border-b border-[#e5e5e5] px-3 py-2">
              {([
                { label: "Today", from: startOfDay(new Date()), to: new Date() },
                { label: "Last 7 days", from: subDays(new Date(), 7), to: new Date() },
                { label: "Last 30 days", from: subDays(new Date(), 30), to: new Date() },
              ] as const).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setRange({ from: preset.from, to: preset.to });
                  }}
                  className="px-2.5 py-1 rounded-md text-[12px] font-medium text-[#525866] hover:bg-[#f5f7fa] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="p-3">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={(date) => date > new Date()}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
              <button onClick={() => setDateOpen(false)} className="px-3 py-1.5 text-[13px] font-medium text-[#525866] hover:text-[#242529] transition-colors">
                Cancel
              </button>
              <button onClick={applyDateRange} disabled={!range?.from} className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#242529] rounded-md hover:bg-[#3a3b3f] transition-colors disabled:opacity-40">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Date chip */}
      {dateLabel && (
        <div className={chipBase}>
          <span className="text-[#242529]">Date</span>
          <span className="text-[#335cff]">{dateLabel}</span>
          <button onClick={removeDateFilter} className="text-[rgba(0,0,0,0.3)] hover:text-[#242529] transition-colors ml-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterKeys.filter(k => k !== "duration_min" && k !== "duration_max").map((key) => {
        const { label, value } = getFilterDisplay(key);
        return (
          <div key={key} className={chipBase}>
            <span className="text-[#242529]">{label}</span>
            <span className="text-[#335cff]">{value}</span>
            <button onClick={() => removeFilter(key)} className="text-[rgba(0,0,0,0.3)] hover:text-[#242529] transition-colors ml-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* Duration chip */}
      {durationDisplay && (
        <div className={chipBase}>
          <span className="text-[#242529]">Duration</span>
          <span className="text-[#335cff]">{durationDisplay}</span>
          <button onClick={() => { removeFilter("duration_min"); removeFilter("duration_max"); }} className="text-[rgba(0,0,0,0.3)] hover:text-[#242529] transition-colors ml-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter button + dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => { setFilterOpen(!filterOpen); setFilterPage(null); setDateOpen(false); }}
          className={btnOutline}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>

        {filterOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 rounded-lg border border-[#e5e5e5] bg-white shadow-lg min-w-[240px]">
            {filterPage === null ? (
              /* Category list */
              <div className="py-1">
                {filterDefs.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => openFilterCategory(f.key)}
                    className="flex w-full items-center justify-between px-3 py-2 text-[14px] text-[#242529] transition-colors hover:bg-[#f5f7fa]"
                  >
                    <span>{f.label}</span>
                    <span className="text-[rgba(0,0,0,0.25)]">›</span>
                  </button>
                ))}
              </div>
            ) : filterPage === "duration" ? (
              /* Duration range input */
              <div>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e5e5e5]">
                  <button onClick={() => setFilterPage(null)} className="text-[rgba(0,0,0,0.4)] hover:text-[#242529] transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-medium text-[#242529]">Duration</span>
                </div>
                <div className="px-3 py-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)] mb-1 block">Min</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={durationMin}
                          onChange={(e) => setDurationMin(e.target.value)}
                          placeholder="0"
                          className="w-full h-8 rounded-md border border-[#e5e5e5] px-2 pr-7 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.25)] focus:outline-none focus:border-[#335cff]"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[rgba(0,0,0,0.3)]">sec</span>
                      </div>
                    </div>
                    <span className="text-[rgba(0,0,0,0.25)] mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)] mb-1 block">Max</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={durationMax}
                          onChange={(e) => setDurationMax(e.target.value)}
                          placeholder="∞"
                          className="w-full h-8 rounded-md border border-[#e5e5e5] px-2 pr-7 text-[14px] text-[#242529] placeholder:text-[rgba(0,0,0,0.25)] focus:outline-none focus:border-[#335cff]"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[rgba(0,0,0,0.3)]">sec</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
                  <button onClick={cancelFilter} className="px-3 py-1.5 text-[13px] font-medium text-[#525866] hover:text-[#242529] transition-colors">
                    Cancel
                  </button>
                  <button onClick={applyFilter} className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#242529] rounded-md hover:bg-[#3a3b3f] transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              /* Category options with checkboxes */
              <div>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e5e5e5]">
                  <button onClick={() => setFilterPage(null)} className="text-[rgba(0,0,0,0.4)] hover:text-[#242529] transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[14px] font-medium text-[#242529]">
                    {filterDefs.find(f => f.key === filterPage)?.label}
                  </span>
                </div>
                <div className="py-1 max-h-[240px] overflow-y-auto">
                  {filterDefs.find(f => f.key === filterPage)?.options.map((opt) => {
                    const selected = pendingSelections.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleSelection(opt.value)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-[14px] text-[#242529] transition-colors hover:bg-[#f5f7fa]"
                      >
                        <div className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          selected ? "bg-[#335cff] border-[#335cff]" : "border-[#d4d4d8]"
                        )}>
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
                  <button onClick={cancelFilter} className="px-3 py-1.5 text-[13px] font-medium text-[#525866] hover:text-[#242529] transition-colors">
                    Cancel
                  </button>
                  <button onClick={applyFilter} className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#242529] rounded-md hover:bg-[#3a3b3f] transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
