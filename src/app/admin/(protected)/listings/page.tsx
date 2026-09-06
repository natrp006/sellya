import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { StatusBadge, ContentStatsBadge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const listings = await db.listings.list();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
      <p className="mt-1 text-sm text-gray-600">All listings, every status. Click one to review or override.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Content</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-b border-gray-100 last:border-none">
                <td className="px-4 py-3">
                  <Link href={`/admin/listings/${listing.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                    {listing.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{listing.sellerId}</td>
                <td className="px-4 py-3 text-gray-700">{formatPrice(listing.priceCents, listing.currency)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={listing.status} />
                </td>
                <td className="px-4 py-3">
                  <ContentStatsBadge stats={listing.contentStats} />
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No listings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
