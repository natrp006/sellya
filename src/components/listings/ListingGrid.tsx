import type { Listing } from "@/types/listing";
import { ListingCard } from "./ListingCard";

export function ListingGrid({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return <p className="py-12 text-center text-sm text-gray-500">No listings yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
