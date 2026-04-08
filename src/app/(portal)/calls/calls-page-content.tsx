"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { CallSearch } from "@/components/calls/call-search";
import { CallFilters } from "@/components/calls/call-filters";
import { CallsTable } from "@/components/calls/calls-table";
import { Button } from "@/components/ui/button";
import type { Call, Agent, OutcomeCategory } from "@/lib/types";

interface CallsPageContentProps {
  calls: Call[];
  total: number;
  page: number;
  perPage: number;
  agents: Agent[];
  outcomes: OutcomeCategory[];
}

export function CallsPageContent({
  calls,
  total,
  page,
  perPage,
  agents,
  outcomes,
}: CallsPageContentProps) {
  const searchParams = useSearchParams();

  function handleExport() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const url = `/api/calls/export${params.toString() ? `?${params}` : ""}`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CallFilters agents={agents} outcomes={outcomes} />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 text-[12px]"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <CallSearch />
        </div>
      </div>
      <CallsTable calls={calls} total={total} page={page} perPage={perPage} />
    </div>
  );
}
