"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from "recharts";
import type { VolumeByHourData } from "@/app/(portal)/dashboard/actions";

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function formatHourFull(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) {
  if (!active || !payload?.[0] || label === undefined) return null;
  const hour = Number(label);
  const isBusinessHours = hour >= 9 && hour < 17;
  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{formatHourFull(hour)}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.55)]">{payload[0].value} call{payload[0].value !== 1 ? "s" : ""}</p>
      {isBusinessHours && (
        <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-0.5">Business hours</p>
      )}
    </div>
  );
}

export function HourlyVolumeChart({ data }: { data: VolumeByHourData[] }) {
  const peak = data.reduce((max, d) => d.count > max.count ? d : max, data[0]);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white">
      <div className="flex items-baseline gap-3 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Hourly Volume</p>
        <span className="text-[12px] text-[rgba(0,0,0,0.3)]">Peak: {formatHourFull(peak?.hour ?? 0)}</span>
      </div>
      <div className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
            <ReferenceArea x1={9} x2={17} fill="#f8f9fa" fillOpacity={1} />
            <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }} interval={2} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="count" fill="#242529" radius={[2, 2, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
