import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getTreasuryStatus } from "@/lib/chain";
import { formatPrice } from "@/lib/format";
import type { ListingStatus } from "@/types/listing";

export const dynamic = "force-dynamic";

const STATUS_ORDER: ListingStatus[] = ["needs_info", "pending_review", "approved", "rejected", "archived", "draft"];

function StatTile({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-shadow hover:shadow-md">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminOverviewPage() {
  const [listings, transactions, users, settings, treasury] = await Promise.all([
    db.listings.list(),
    db.transactions.listAll(),
    db.users.listAll(),
    Promise.resolve(getSettings()),
    getTreasuryStatus().catch(() => null),
  ]);

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: listings.filter((l) => l.status === status).length,
  })).filter((s) => s.count > 0);

  const released = transactions.filter((t) => t.status === "released");
  const totalVolumeCents = released.reduce((sum, t) => sum + t.amountCents, 0);
  const totalCommissionCents = released.reduce((sum, t) => sum + Math.round((t.amountCents * t.commissionBps) / 10000), 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-600">Platform-wide stats and moderation status.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Listings by status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {byStatus.map((s) => (
            <StatTile key={s.status} label={s.status.replace("_", " ")} value={s.count} href="/admin/listings" />
          ))}
          {byStatus.length === 0 && <p className="text-sm text-gray-500">No listings yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Transactions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total transactions" value={transactions.length} href="/admin/transactions" />
          <StatTile label="Completed sales" value={released.length} href="/admin/transactions" />
          <StatTile label="Gross volume" value={formatPrice(totalVolumeCents, "usdc")} />
          <StatTile label="Commission revenue" value={formatPrice(totalCommissionCents, "usdc")} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Treasury (Base mainnet)</h2>
        {treasury ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="ETH (for gas)" value={`${Number(treasury.ethBalance).toFixed(5)} ETH`} />
            <StatTile label="USDC balance" value={`${Number(treasury.usdcBalance).toFixed(2)} USDC`} />
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Address</p>
              <p className="mt-1 break-all font-mono text-xs text-gray-700">{treasury.address}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Not configured — set <code className="rounded bg-gray-100 px-1">TREASURY_PRIVATE_KEY</code> to enable
            real payments.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Platform</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Users" value={users.length} href="/admin/users" />
          <StatTile label="Commission rate" value={`${(settings.commissionBps / 100).toFixed(1)}%`} href="/admin/settings" />
          <StatTile label="AI moderation" value={settings.aiApiKey ? "Live AI" : "Heuristic fallback"} href="/admin/settings" />
        </div>
      </div>
    </div>
  );
}
