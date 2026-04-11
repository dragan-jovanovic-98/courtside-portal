"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import type { DateRange } from "react-day-picker";

const presets = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRange = searchParams.get("range") || "30d";
  const [pendingRange, setPendingRange] = useState<string | null>(null);
  const activeRange = pendingRange ?? urlRange;
  const [range, setRange] = useState<DateRange | undefined>();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear optimistic state once the URL catches up
  useEffect(() => {
    if (pendingRange && urlRange === pendingRange) setPendingRange(null);
  }, [urlRange, pendingRange]);

  function setPreset(value: string) {
    setPendingRange(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
    setDesktopOpen(false);
  }

  function applyCustomRange(closeFn: () => void) {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`);
    closeFn();
  }

  // Close desktop popup on outside click / Escape
  useEffect(() => {
    if (!desktopOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDesktopOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDesktopOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [desktopOpen]);

  const displayLabel =
    activeRange === "custom" && searchParams.get("from") && searchParams.get("to")
      ? searchParams.get("from") === searchParams.get("to")
        ? format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")
        : `${format(new Date(searchParams.get("from")! + "T00:00"), "MMM d")} – ${format(new Date(searchParams.get("to")! + "T00:00"), "MMM d")}`
      : "Custom";

  return (
    <>
      <div
        className="relative inline-flex w-full sm:w-auto"
        ref={containerRef}
      >
        <div className="flex w-full items-center rounded-lg border border-[#eeeff1] bg-[#fbfbfb] p-0.5">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setPreset(preset.value)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors active:bg-white active:shadow-sm sm:flex-initial sm:py-1",
                activeRange === preset.value
                  ? "bg-white text-[#242529] shadow-sm"
                  : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]"
              )}
            >
              {preset.label}
            </button>
          ))}

          <button
            onClick={() => {
              // Mobile uses sheet, desktop uses popover
              if (
                typeof window !== "undefined" &&
                window.matchMedia("(max-width: 767px)").matches
              ) {
                setMobileOpen(true);
              } else {
                setDesktopOpen(!desktopOpen);
              }
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors active:bg-white active:shadow-sm sm:flex-initial sm:py-1",
              activeRange === "custom" || desktopOpen
                ? "bg-white text-[#242529] shadow-sm"
                : "text-[rgba(0,0,0,0.45)] hover:text-[#242529]"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {displayLabel}
          </button>
        </div>

        {/* Desktop popover */}
        {desktopOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 hidden rounded-lg border border-[#e5e5e5] bg-white shadow-lg md:block">
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
              <button
                onClick={() => setDesktopOpen(false)}
                className="px-3 py-1.5 text-[13px] font-medium text-[#525866] hover:text-[#242529] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyCustomRange(() => setDesktopOpen(false))}
                disabled={!range?.from}
                className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#242529] rounded-md hover:bg-[#3a3b3f] transition-colors disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sheet */}
      <ResponsiveDialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <ResponsiveDialogContent className="md:hidden">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Custom date range</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              disabled={(date) => date > new Date()}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-[#eeeff1] pt-3">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-lg text-[14px] font-medium text-[rgba(0,0,0,0.65)] active:bg-[#eeeff1]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => applyCustomRange(() => setMobileOpen(false))}
              disabled={!range?.from}
              className="flex h-11 flex-1 items-center justify-center rounded-lg bg-[#242529] text-[14px] font-semibold text-white active:bg-[#3a3b3f] disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
