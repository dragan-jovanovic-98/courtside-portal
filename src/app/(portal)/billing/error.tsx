"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertTriangle className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
      <p className="mt-4 text-[14px] font-medium text-[#242529]">Failed to load billing</p>
      <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Something went wrong while fetching your billing data.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
