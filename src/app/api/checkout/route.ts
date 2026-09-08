import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { paymentService } from "@/lib/payments";
import { logUnexpectedError } from "@/lib/logging";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "checkout", 20, 60 * 1000);
  if (limited) return limited;

  const { listingId } = (await request.json()) as { listingId: string };

  const listing = await db.listings.getById(listingId);
  if (!listing || listing.status !== "approved") {
    return NextResponse.json({ error: "Listing is not available for purchase" }, { status: 400 });
  }

  const buyer = await getCurrentUser();
  if (!buyer) {
    return NextResponse.json({ error: "No anonymous session available" }, { status: 401 });
  }

  let escrow;
  try {
    escrow = await paymentService.createEscrowIntent(listing, buyer);
  } catch (err) {
    logUnexpectedError(`checkout for listing ${listingId}`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payments are not configured yet" },
      { status: 503 }
    );
  }

  const transaction = await db.transactions.create({
    escrowId: escrow.escrowId,
    listingId: listing.id,
    buyerId: buyer.id,
    sellerId: listing.sellerId,
    amountCents: escrow.amountCents,
    amountUnits: escrow.amountUnits,
    currency: escrow.token,
    chain: escrow.chain,
    depositAddress: escrow.depositAddress,
    commissionBps: escrow.commissionBps,
    status: "awaiting_payment",
  });

  // Buyer interest counts as activity — keeps a listing that's actively getting looked at from expiring.
  await db.listings.touchActivity(listing.id);

  return NextResponse.json({ escrow, transactionId: transaction.id });
}
