import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import type { ListingStatus } from "@/types/listing";

const OVERRIDABLE_STATUSES: ListingStatus[] = ["approved", "rejected", "archived"];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = (await request.json()) as { status: ListingStatus };
  if (!OVERRIDABLE_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be approved, rejected, or archived" }, { status: 400 });
  }

  const listing = await db.listings.getById(params.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const updated = await db.listings.updateStatus(listing.id, status, listing.moderation);
  return NextResponse.json({ listing: updated });
}
