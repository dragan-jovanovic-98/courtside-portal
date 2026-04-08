"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

const presets = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") || "30d";
  const [range, setRange] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function setPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  function applyCustomRange() {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`);
    setOpen(false);
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const displayLabel = activeRange === "custom" && searchParams.get("from") && searchParams.get("to")
    ? searchParams.get("from") === searchParams.get("to")
      ? format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")
      : `${format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")} – ${format(new Date(searchParams.get("to")! + "T00:00"), "MMM d")}`
    : "Custom";

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-0.5">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setPreset(preset.value)}
            className={cn(
              "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
              activeRange === preset.value
                ? "bg-white text-[#242529] shadow-sm"
                : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]"
            )}
          >
            {preset.label}
          </button>
        ))}

        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
            activeRange === "custom" || open
              ? "bg-white text-[#242529] shadow-sm"
              : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayLabel}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
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
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-[13px] font-medium text-[#525866] hover:text-[#242529] transition-colors">
              Cancel
            </button>
            <button onClick={applyCustomRange} disabled={!range?.from} className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#242529] rounded-md hover:bg-[#3a3b3f] transition-colors disabled:opacity-40">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
