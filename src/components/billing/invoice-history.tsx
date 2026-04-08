"use client";

import { ExternalLink, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { useOrganization } from "@/components/providers/org-provider";
import type { Invoice } from "@/lib/types";

const cols = "140px 120px 100px 1fr";
const cellBase = "flex items-center px-3 border-r border-[#eeeff1]";
const cellLast = "flex items-center px-3";
const headerText = "text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.4)]";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  open: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  draft: { bg: "bg-[#eeeff1]", text: "text-[rgba(0,0,0,0.55)]", dot: "bg-[rgba(0,0,0,0.35)]" },
  void: { bg: "bg-[#eeeff1]", text: "text-[rgba(0,0,0,0.55)]", dot: "bg-[rgba(0,0,0,0.35)]" },
  uncollectible: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  const { organization } = useOrganization();
  const tz = organization.timezone;
  return (
    <div className="rounded-lg border border-[#eeeff1] bg-white overflow-hidden">
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(0,0,0,0.45)]">Invoice History</p>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Receipt className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
          <p className="mt-4 text-[14px] font-medium text-[#242529]">No invoices yet</p>
          <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">Your billing history will appear here after your first charge.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="grid border-y border-[#eeeff1]" style={{ gridTemplateColumns: cols }}>
            <div className={cn(cellBase, headerText, "h-10")}>Date</div>
            <div className={cn(cellBase, headerText, "h-10")}>Amount</div>
            <div className={cn(cellBase, headerText, "h-10")}>Status</div>
            <div className={cn(cellLast, headerText, "h-10")}>Invoice</div>
          </div>

          {/* Rows */}
          {invoices.map((invoice, i) => {
            const status = statusStyles[invoice.status] || statusStyles.draft;
            return (
              <div
                key={invoice.id}
                className={cn(
                  "grid",
                  i < invoices.length - 1 && "border-b border-[#eeeff1]"
                )}
                style={{ gridTemplateColumns: cols, height: 40 }}
              >
                <div className={cn(cellBase, "text-[14px] text-[#242529]")}>
                  {formatDate(invoice.created_at_stripe, tz)}
                </div>
                <div className={cn(cellBase, "text-[14px] font-medium text-[#242529] tabular-nums")}>
                  ${invoice.amount_paid.toFixed(2)}
                </div>
                <div className={cn(cellBase)}>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium capitalize",
                    status.bg, status.text
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                    {invoice.status}
                  </span>
                </div>
                <div className={cn(cellLast)}>
                  {invoice.hosted_invoice_url && (
                    <a
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#335cff] hover:underline"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
