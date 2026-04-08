"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiData {
  totalCalls: number;
  minutesTalked: number;
  avgDuration: number;
  conversions: number;
  conversionLabel: string;
  revenueImpact: number;
  avgOrderValueConfigured: boolean;
  hasPreviousData: boolean;
  trends: {
    totalCalls: number | null;
    minutesTalked: number | null;
    avgDuration: number | null;
    conversions: number | null;
    revenueImpact: number | null;
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;

  if (isNeutral) {
    return <span className="text-[12px] font-medium text-[rgba(0,0,0,0.3)]">0%</span>;
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[12px] font-medium",
      isPositive ? "text-emerald-600" : "text-rose-500"
    )}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    { label: "Calls Handled", value: data.totalCalls.toLocaleString(), trend: data.trends.totalCalls },
    { label: "Time Saved", value: data.minutesTalked % 1 === 0 ? data.minutesTalked.toLocaleString() + " min" : data.minutesTalked.toFixed(1) + " min", trend: data.trends.minutesTalked },
    { label: "Avg Duration", value: formatDuration(data.avgDuration), trend: data.trends.avgDuration },
    { label: data.conversionLabel, value: data.conversions % 1 === 0 ? data.conversions.toLocaleString() : data.conversions.toFixed(1), trend: data.trends.conversions },
    {
      label: "Revenue Impact",
      value: data.avgOrderValueConfigured ? formatCurrency(data.revenueImpact) : "$0",
      trend: data.trends.revenueImpact,
      note: !data.avgOrderValueConfigured ? "Set in Organization settings" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#eeeff1] bg-[#eeeff1] lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col justify-between bg-white px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">
            {card.label}
          </p>
          <div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-[22px] font-bold leading-none text-[#242529] tabular-nums tracking-[-0.5px]">
                {card.value}
              </p>
              <Trend value={card.trend} />
            </div>
            {card.note ? (
              <p className="mt-2 text-[11px] text-[rgba(0,0,0,0.3)]">{card.note}</p>
            ) : data.hasPreviousData ? (
              <p className="mt-2 text-[11px] text-[rgba(0,0,0,0.3)]">vs. previous period</p>
            ) : (
              <p className="mt-2 text-[11px] text-[rgba(0,0,0,0.2)]">Not enough data for trends</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
