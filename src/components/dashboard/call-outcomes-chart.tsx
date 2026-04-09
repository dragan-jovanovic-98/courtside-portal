"use client";

import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getOutcomeColor, DEFAULT_OUTCOME_COLORS } from "@/lib/constants";
import type { OutcomeChartData } from "@/app/(portal)/dashboard/actions";

const TIER_LABELS: Record<string, string> = {
  high: "Converted",
  medium: "Engaged",
  low: "Dropped off",
};

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: OutcomeChartData }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{d.name}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-[12px] text-[rgba(0,0,0,0.55)]">{d.count} call{d.count !== 1 ? "s" : ""}</p>
        <p className="text-[12px] text-[rgba(0,0,0,0.55)]">{fmtCurrency(d.estimatedValue)} est. value</p>
      </div>
    </div>
  );
}

export function CallOutcomesChart({ data }: { data: OutcomeChartData[] }) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white h-full flex flex-col">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Call Outcomes</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center pb-8">
          <BarChart2 className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No outcome data</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Call outcomes will appear here once calls are logged.</p>
        </div>
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 40 + 20);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white h-full flex flex-col">
      <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Outcomes
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.35)] sm:gap-4">
          {Object.entries(TIER_LABELS).map(([tier, label]) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: DEFAULT_OUTCOME_COLORS[tier] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 px-2 pb-4 sm:px-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.3)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11, fill: "#242529", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8f9fa" }} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              barSize={20}
              className="cursor-pointer"
              onClick={(_: unknown, index: number) => {
                const item = data[index];
                if (item) router.push(`/calls?outcome=${item.id}`);
              }}
            >
              {data.map((e, i) => <Cell key={i} fill={e.color || DEFAULT_OUTCOME_COLORS[e.impactTier] || DEFAULT_OUTCOME_COLORS.low} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
