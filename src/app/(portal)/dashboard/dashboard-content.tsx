"use client";

import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { KpiCards, type KpiData } from "@/components/dashboard/kpi-cards";
import { CallOutcomesChart } from "@/components/dashboard/call-outcomes-chart";
import { HoursPieChart } from "@/components/dashboard/hours-pie-chart";
import { HourlyVolumeChart } from "@/components/dashboard/hourly-volume-chart";
import { DailyVolumeChart } from "@/components/dashboard/daily-volume-chart";
import { useOrganization } from "@/components/providers/org-provider";
import type {
  OutcomeChartData,
  HoursChartData,
  VolumeByHourData,
  VolumeByDayData,
} from "./actions";

interface DashboardContentProps {
  kpiData: KpiData;
  chartData: {
    outcomeChartData: OutcomeChartData[];
    hoursData: HoursChartData;
    volumeByHour: VolumeByHourData[];
    volumeByDay: VolumeByDayData[];
  };
  activeAgents: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardContent({
  kpiData,
  chartData,
  activeAgents,
}: DashboardContentProps) {
  const { user } = useOrganization();

  return (
    <div className="space-y-6">
      {/* Greeting + controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#242529] tracking-[-0.3px]">
            {getGreeting()}, {user.first_name}.
          </h1>
          <p className="mt-0.5 text-[14px] font-medium text-[rgba(0,0,0,0.55)]">
            {activeAgents} agent{activeAgents !== 1 ? "s" : ""} active
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {/* KPIs */}
      <KpiCards data={kpiData} />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CallOutcomesChart data={chartData.outcomeChartData} />
        </div>
        <HoursPieChart data={chartData.hoursData} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HourlyVolumeChart data={chartData.volumeByHour} />
        <DailyVolumeChart data={chartData.volumeByDay} />
      </div>
    </div>
  );
}
