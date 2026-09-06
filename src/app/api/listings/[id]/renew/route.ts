import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const listing = await db.listings.getById(params.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user || user.id !== listing.sellerId) {
    return NextResponse.json({ error: "Only the seller can renew this listing" }, { status: 403 });
  }

  const updated = await db.listings.renew(listing.id);
  return NextResponse.json({ listing: updated });
}
