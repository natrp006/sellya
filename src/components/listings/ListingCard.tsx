import Link from "next/link";
import type { Listing } from "@/types/listing";
import { formatPrice } from "@/lib/format";
import { StatusBadge, ContentStatsBadge } from "@/components/ui/Badge";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={listing.status} />
        <ContentStatsBadge stats={listing.contentStats} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{listing.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{listing.summary}</p>
      {listing.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {listing.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 text-lg font-bold text-gray-900">
        {formatPrice(listing.priceCents, listing.currency)}
      </div>
    </Link>
  );
}
