import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysUntilExpiry, LISTING_EXPIRY_DAYS } from "@/lib/listings/expiry";
import { StatusBadge, ContentStatsBadge } from "@/components/ui/Badge";
import { RenewButton } from "@/components/listings/RenewButton";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { formatPrice } from "@/lib/format";
import type { Listing } from "@/types/listing";

// Per-seller data that changes at runtime — must render per-request.
export const dynamic = "force-dynamic";

function ActivityCell({ listing }: { listing: Listing }) {
  if (listing.status === "expired") {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs text-gray-500">Expired from inactivity</span>
        <RenewButton listingId={listing.id} label="Reactivate" />
      </div>
    );
  }

  if (listing.status === "approved") {
    const daysLeft = daysUntilExpiry(listing.lastActivityAt);
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="text-xs text-gray-500">
          {daysLeft <= 7 ? `Expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : `Active`}
        </span>
        <RenewButton listingId={listing.id} />
      </div>
    );
  }

  return <span className="text-gray-400">—</span>;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const listings = user ? await db.listings.listBySeller(user.id) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Your listings</h1>
      <p className="mt-2 text-sm text-gray-600">
        Track moderation status for everything you&apos;ve submitted. Listings auto-expire after{" "}
        {LISTING_EXPIRY_DAYS} days with no buyer or seller activity — click &ldquo;Keep active&rdquo; any time to
        reset the clock.
      </p>

      <div className="mt-6">
        <ConnectWalletButton
          currentAddress={user?.walletAddress ?? null}
          verified={!!user?.walletVerifiedAt}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Content</th>
              <th className="px-4 py-3">Activity</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-b border-gray-100 last:border-none">
                <td className="px-4 py-3">
                  <Link href={`/listings/${listing.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                    {listing.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatPrice(listing.priceCents, listing.currency)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={listing.status} />
                </td>
                <td className="px-4 py-3">
                  <ContentStatsBadge stats={listing.contentStats} />
                </td>
                <td className="px-4 py-3">
                  <ActivityCell listing={listing} />
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  You haven&apos;t listed anything yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
