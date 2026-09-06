import { db } from "@/lib/db";
import { usdcUnitsToDisplay } from "@/lib/chain";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  awaiting_payment: "bg-amber-100 text-amber-700",
  funded: "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
  refunded: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
};

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`https://basescan.org/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-brand-600 hover:underline"
    >
      {hash.slice(0, 10)}…
    </a>
  );
}

export default async function AdminTransactionsPage() {
  const transactions = await db.transactions.listAll();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every escrow intent created, across all listings. Exact amount is what buyers were asked to send — it
        includes a small unique offset over the listed price so deposits can be matched automatically.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Exact amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Deposit tx</th>
              <th className="px-4 py-3">Payout tx</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-none">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.listingId}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.buyerId}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.sellerId}</td>
                <td className="px-4 py-3 text-gray-700">
                  {t.amountUnits ? `${usdcUnitsToDisplay(BigInt(t.amountUnits))} ${t.currency.toUpperCase()}` : formatPrice(t.amountCents, t.currency)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {t.status.replace("_", " ")}
                  </span>
                  {t.payoutError && <p className="mt-1 max-w-[200px] text-xs text-amber-700">{t.payoutError}</p>}
                </td>
                <td className="px-4 py-3">{t.depositTxHash ? <TxLink hash={t.depositTxHash} /> : "—"}</td>
                <td className="px-4 py-3">{t.payoutTxHash ? <TxLink hash={t.payoutTxHash} /> : "—"}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
