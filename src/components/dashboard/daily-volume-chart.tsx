"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { VolumeByDayData } from "@/app/(portal)/dashboard/actions";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: VolumeByDayData }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{d.day}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.55)]">{d.count} call{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function DailyVolumeChart({ data }: { data: VolumeByDayData[] }) {
  const ordered = [...data.slice(1), data[0]];
  const busiest = ordered.reduce((max, d) => d.count > max.count ? d : max, ordered[0]);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Daily Volume
        </p>
        <span className="text-[12px] text-[rgba(0,0,0,0.3)]">
          Busiest: {busiest?.day ?? "—"}
        </span>
      </div>
      <div className="px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ordered} margin={{ left: -20, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="count" fill="#242529" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
