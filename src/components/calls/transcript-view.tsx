"use client";

import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/lib/types";

export function TranscriptView({ entries }: { entries: TranscriptEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <p className="text-[13px] text-[rgba(0,0,0,0.45)]">No transcript available.</p>
    );
  }

  return (
    <div className="max-h-[500px] space-y-3 overflow-y-auto rounded-md border border-[#eeeff1] bg-[#f8f9fa] p-4">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col",
            entry.role === "agent" ? "items-start" : "items-end"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-[13px]",
              entry.role === "agent"
                ? "bg-white border border-[#eeeff1]"
                : "bg-[#242529] text-white"
            )}
          >
            <p>{entry.content}</p>
          </div>
          <span className="mt-0.5 text-[11px] text-[rgba(0,0,0,0.45)]">
            {entry.role === "agent" ? "Agent" : "Caller"}{" "}
            {entry.timestamp && `· ${entry.timestamp}`}
          </span>
        </div>
      ))}
    </div>
  );
}
