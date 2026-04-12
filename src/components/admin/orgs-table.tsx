import Link from "next/link";
import type { Organization, Subscription } from "@/lib/types";

interface OrgRow {
  org: Organization;
  subscription: Subscription | null;
}

function statusBadge(status: string | null) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-md border border-[#eeeff1] px-1.5 py-0.5 text-[11px] font-medium text-[rgba(0,0,0,0.55)]">
        No plan
      </span>
    );
  }
  const tone: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trialing: "bg-blue-50 text-blue-700 border-blue-200",
    past_due: "bg-amber-50 text-amber-700 border-amber-200",
    incomplete: "bg-zinc-50 text-zinc-700 border-zinc-200",
    canceled: "bg-zinc-50 text-zinc-500 border-zinc-200",
  };
  const classes = tone[status] ?? "bg-zinc-50 text-zinc-700 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${classes}`}>
      {status}
    </span>
  );
}

export function OrgsTable({ rows }: { rows: OrgRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-[rgba(0,0,0,0.55)]">No organizations yet.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#eeeff1]">
      <table className="w-full text-[13px]">
        <thead className="bg-[#fbfbfb]">
          <tr className="text-left text-[12px] font-medium text-[rgba(0,0,0,0.55)]">
            <th className="px-3 py-2.5 font-medium">Organization</th>
            <th className="px-3 py-2.5 font-medium">Stripe customer</th>
            <th className="px-3 py-2.5 font-medium">Current plan</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Usage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ org, subscription }) => (
            <tr
              key={org.id}
              className="border-t border-[#eeeff1] transition-colors hover:bg-[#fbfbfb]"
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className="block"
                >
                  <div className="font-medium text-[#242529]">{org.name}</div>
                  <div className="text-[12px] text-[rgba(0,0,0,0.55)]">{org.slug}</div>
                </Link>
              </td>
              <td className="px-3 py-2.5">
                {org.stripe_customer_id ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[rgba(0,0,0,0.55)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Linked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[rgba(0,0,0,0.55)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                    None
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-[#242529]">
                {subscription?.plan_name ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                {statusBadge(subscription?.status ?? null)}
              </td>
              <td className="px-3 py-2.5 text-[rgba(0,0,0,0.55)]">
                {subscription
                  ? `${subscription.call_minutes_used} / ${subscription.call_minutes_limit}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
