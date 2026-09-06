import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Reads the live listing store — see src/lib/db for why this must stay dynamic.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await db.listings.list({ status: "approved" });

  return [
    {
      url: "https://sellya.info",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...listings.map((listing) => ({
      url: `https://sellya.info/listings/${listing.id}`,
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
