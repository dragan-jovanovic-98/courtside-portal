"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label, Tooltip } from "recharts";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import type { HoursChartData } from "@/app/(portal)/dashboard/actions";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.[0]) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white px-3 py-2 shadow-sm">
      <p className="text-[13px] font-semibold text-[#242529]">{name}</p>
      <p className="text-[12px] text-[rgba(0,0,0,0.55)]">{value} call{value !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function HoursPieChart({ data }: { data: HoursChartData }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (pendingIndex === null) return;
    const t = setTimeout(() => setPendingIndex(null), 4000);
    return () => clearTimeout(t);
  }, [pendingIndex]);

  const chartData = [
    { name: "Business Hours", value: data.businessHours, color: "#242529", filter: "business" },
    { name: "After Hours", value: data.afterHours, color: "#d4d4d8", filter: "after" },
  ].filter((d) => d.value > 0);

  const pendingItem = pendingIndex !== null ? chartData[pendingIndex] : null;

  if (data.total === 0) {
    return (
      <div className="rounded-lg border border-[#eeeff1] bg-white h-full flex flex-col">
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Call Hours</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center pb-8">
          <Clock className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No calls yet</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Hour distribution will show once calls come in.</p>
        </div>
      </div>
    );
  }

  const bPct = Math.round((data.businessHours / data.total) * 100);
  const aPct = Math.round((data.afterHours / data.total) * 100);

  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white h-full flex flex-col">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Call Hours</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-4">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={58}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              className="cursor-pointer"
              onClick={(_: unknown, index: number) => {
                const item = chartData[index];
                if (!item) return;
                if (!isMobile) {
                  router.push(`/calls?hours=${item.filter}`);
                  return;
                }
                if (pendingIndex === index) {
                  router.push(`/calls?hours=${item.filter}`);
                  setPendingIndex(null);
                } else {
                  setPendingIndex(index);
                }
              }}
            >
              {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
              <Label
                content={() => (
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                    <tspan x="50%" dy="-6" fontSize="22" fontWeight="700" fill="#242529" letterSpacing="-0.5">{data.total}</tspan>
                    <tspan x="50%" dy="18" fontSize="11" fontWeight="600" fill="rgba(0,0,0,0.35)" letterSpacing="1">CALLS</tspan>
                  </text>
                )}
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {pendingItem && (
          <div className="mt-1 w-full rounded-md bg-[#f4f4f5] px-3 py-2 text-center text-[12px] font-medium text-[rgba(0,0,0,0.6)] md:hidden">
            Tap <span className="text-[#242529]">{pendingItem.name}</span> again to open
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
          <button
            onClick={() => router.push("/calls?hours=business")}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#242529]" />
            <div>
              <span className="text-[14px] font-bold text-[#242529]">{bPct}%</span>
              <span className="text-[12px] text-[rgba(0,0,0,0.4)] ml-1.5">
                Business hours
              </span>
            </div>
          </button>
          <button
            onClick={() => router.push("/calls?hours=after")}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#d4d4d8]" />
            <div>
              <span className="text-[14px] font-bold text-[#242529]">{aPct}%</span>
              <span className="text-[12px] text-[rgba(0,0,0,0.4)] ml-1.5">
                After hours
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
