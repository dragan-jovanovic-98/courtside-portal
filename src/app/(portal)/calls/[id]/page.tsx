"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CallDetail } from "@/components/calls/call-detail";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Call } from "@/lib/types";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: callData, error: callError } = await supabase
        .from("portal_calls")
        .select(
          "*, agent:portal_agents(id, name, agent_type), outcome_category:portal_outcome_categories(id, name, close_likelihood), contact:portal_contacts!portal_calls_contact_id_fkey(id, phone_number, first_name, last_name, total_calls)"
        )
        .eq("id", id)
        .single();

      if (callError || !callData) {
        setError(callError?.message || "Call not found.");
        setLoading(false);
        return;
      }

      const { data: actions } = await supabase
        .from("portal_call_actions")
        .select("*")
        .eq("call_id", id)
        .order("created_at");

      setCall({ ...callData, actions: actions || [] } as Call);
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-[#eeeff1]" />
        <div className="rounded-lg border border-[#eeeff1] bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#eeeff1]" />
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-[#eeeff1]" />
              <div className="h-3.5 w-56 animate-pulse rounded bg-[#eeeff1]" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-[#eeeff1]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[#eeeff1]" />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-[#eeeff1]" style={{ width: `${80 - i * 8}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div>
        <Link
          href="/calls"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[rgba(0,0,0,0.55)] transition-colors hover:text-[#242529]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Call Logs
        </Link>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">
            {error ? "Failed to load call" : "Call not found"}
          </p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
            {error || "This call may have been deleted or you may not have access."}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/calls")}>
            Back to calls
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/calls"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[rgba(0,0,0,0.55)] transition-colors hover:text-[#242529]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Call Logs
      </Link>
      <CallDetail call={call} />
    </div>
  );
}
