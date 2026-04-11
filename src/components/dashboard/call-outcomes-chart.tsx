"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getOutcomeColor } from "@/lib/constants";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import type { OutcomeChartData } from "@/app/(portal)/dashboard/actions";

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
  const isMobile = useIsMobile();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pendingIndex === null) return;
    const t = setTimeout(() => setPendingIndex(null), 4000);
    return () => clearTimeout(t);
  }, [pendingIndex]);

  const pendingItem = pendingIndex !== null ? data[pendingIndex] : null;

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
      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
          Call Outcomes
        </p>
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
                if (!item) return;
                if (!isMobile) {
                  router.push(`/calls?outcome=${item.id}`);
                  return;
                }
                if (pendingIndex === index) {
                  router.push(`/calls?outcome=${item.id}`);
                  setPendingIndex(null);
                } else {
                  setPendingIndex(index);
                }
              }}
            >
              {data.map((e, i) => <Cell key={i} fill={getOutcomeColor(e)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {pendingItem && (
          <div className="mx-2 -mt-1 mb-1 rounded-md bg-[#f4f4f5] px-3 py-2 text-center text-[12px] font-medium text-[rgba(0,0,0,0.6)] md:hidden">
            Tap <span className="text-[#242529]">{pendingItem.name}</span> again to open
          </div>
        )}
      </div>
    </div>
  );
}
