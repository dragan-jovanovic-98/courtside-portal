"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Gift } from "lucide-react";
import { formatDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Referral } from "@/lib/types";

export default function ReferralsPage() {
  const { organization } = useOrganization();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_referrals")
        .select("*")
        .eq("referrer_org_id", organization.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setReferrals(data as Referral[]);
        setReferralCode(data[0].referral_code);
      } else {
        const code = organization.slug + "-" + Math.random().toString(36).slice(2, 8);
        const { data: newRef } = await supabase
          .from("portal_referrals")
          .insert({
            referrer_org_id: organization.id,
            referral_code: code,
            status: "pending",
          })
          .select()
          .single();

        if (newRef) {
          setReferralCode(newRef.referral_code);
          setReferrals([newRef as Referral]);
        }
      }
      setLoading(false);
    }
    load();
  }, [organization.id, organization.slug]);

  const referralUrl = referralCode
    ? `https://courtsideai.com/refer/${referralCode}`
    : "";

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const signedUp = referrals.filter((r) => r.status !== "pending").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[10px] border border-[#eeeff1] bg-white px-5 py-4">
          <div className="h-3 w-28 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-4 flex items-center gap-2">
            <div className="h-9 flex-1 animate-pulse rounded-md bg-[#eeeff1]" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-[#eeeff1]" />
          </div>
          <div className="mt-3 h-3 w-52 animate-pulse rounded bg-[#eeeff1]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-[10px] border border-[#eeeff1] bg-white px-5 py-4">
              <div className="h-3 w-20 animate-pulse rounded bg-[#eeeff1]" />
              <div className="mt-3 h-7 w-8 animate-pulse rounded bg-[#eeeff1]" />
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-[#eeeff1] bg-white px-5 py-4">
          <div className="h-3 w-24 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3.5 w-28 animate-pulse rounded bg-[#eeeff1]" />
                <div className="h-5 w-16 animate-pulse rounded-md bg-[#eeeff1]" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-[#eeeff1]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Link */}
      <div className="rounded-[10px] border border-[#eeeff1] bg-white px-4 py-4 sm:px-5">
        <p className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
          Your Referral Link
        </p>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-[#eeeff1] bg-[#f8f9fa] px-3 py-2.5 text-[12.5px] text-[#242529] sm:py-2 sm:text-[13px]">
              {referralUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[12px] text-[rgba(0,0,0,0.45)]">
            Share this link with other businesses. When they sign up, you&apos;ll
            both benefit.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-[10px] border border-[#eeeff1] bg-white px-4 py-4 sm:px-5">
          <p className="text-[12px] text-[rgba(0,0,0,0.45)]">Total Referrals</p>
          <p className="mt-1 text-[22px] sm:text-[24px] font-bold text-[#242529] tracking-[-0.5px]">{referrals.length}</p>
        </div>
        <div className="rounded-[10px] border border-[#eeeff1] bg-white px-4 py-4 sm:px-5">
          <p className="text-[12px] text-[rgba(0,0,0,0.45)]">Signed Up</p>
          <p className="mt-1 text-[22px] sm:text-[24px] font-bold text-[#242529] tracking-[-0.5px]">{signedUp}</p>
        </div>
      </div>

      {/* Referral History */}
      <div className="rounded-[10px] border border-[#eeeff1] bg-white">
        <div className="px-4 py-4 sm:px-5">
          <p className="text-[12px] font-medium uppercase text-[rgba(0,0,0,0.45)] tracking-[-0.12px]">
            Referral History
          </p>
        </div>
        <div className="px-4 pb-5 sm:px-5">
          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Gift className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
              <p className="mt-4 text-[14px] font-medium text-[#242529]">No referrals yet</p>
              <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Share your link to start earning referral rewards.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell className="font-mono text-[13px]">
                          {ref.referral_code}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ref.status === "rewarded"
                                ? "default"
                                : ref.status === "signed_up"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {ref.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[13px] text-[rgba(0,0,0,0.55)]">
                          {formatDate(ref.created_at, organization.timezone)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden divide-y divide-[#eeeff1]">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-[13px] text-[#242529]">
                        {ref.referral_code}
                      </span>
                      <span className="text-[12px] text-[rgba(0,0,0,0.5)]">
                        {formatDate(ref.created_at, organization.timezone)}
                      </span>
                    </div>
                    <Badge
                      variant={
                        ref.status === "rewarded"
                          ? "default"
                          : ref.status === "signed_up"
                            ? "secondary"
                            : "outline"
                      }
                      className="shrink-0"
                    >
                      {ref.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rewards placeholder */}
      <div className="rounded-[10px] border border-[#eeeff1] bg-white px-5 py-5">
        <div className="flex items-center gap-4">
          <Gift className="h-8 w-8 text-[rgba(0,0,0,0.35)]" />
          <div>
            <p className="text-[14px] font-medium text-[#242529]">Referral rewards coming soon</p>
            <p className="mt-0.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              Earn credits and discounts for every business you refer that signs up for Courtside AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
