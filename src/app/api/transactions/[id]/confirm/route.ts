import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getContent, renderFullView } from "@/lib/content";
import { findIncomingTransfer, isValidAddress, sendUsdcPayout } from "@/lib/chain";
import { logUnexpectedError } from "@/lib/logging";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Real on-chain check, not a client-trusted claim: scans the treasury
 * address for a Transfer event matching this transaction's exact expected
 * amount. If found, the buyer gets the content immediately (payment is
 * genuinely verified on-chain) — the payout to the seller is attempted as a
 * best-effort next step and can fail (e.g. no valid wallet on file) without
 * blocking delivery; retrying this endpoint retries the payout too.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // This is polled by the buyer's "Check for payment" button, so the cap has to stay generous.
  const limited = checkRateLimit(request, "transaction-confirm", 30, 60 * 1000);
  if (limited) return limited;

  const transactionId = params.id;
  const initial = await db.transactions.getById(transactionId);
  if (!initial) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (initial.status !== "awaiting_payment" && initial.status !== "funded" && initial.status !== "released") {
    return NextResponse.json({ error: `Transaction is ${initial.status}` }, { status: 400 });
  }

  if (initial.status === "awaiting_payment") {
    const found = await findIncomingTransfer(initial.depositAddress, BigInt(initial.amountUnits));
    if (!found) {
      return NextResponse.json({
        status: "awaiting_payment",
        message: "No matching payment detected on-chain yet — this can take a minute or two after sending.",
      });
    }
    await db.transactions.recordDeposit(transactionId, found.txHash, found.from);
  }

  const afterDeposit = await db.transactions.getById(transactionId);
  if (afterDeposit && afterDeposit.status === "funded") {
    const seller = await db.users.getById(afterDeposit.sellerId);
    if (seller?.walletAddress && isValidAddress(seller.walletAddress)) {
      try {
        const amountUnits = BigInt(afterDeposit.amountUnits);
        const commissionUnits = (amountUnits * BigInt(afterDeposit.commissionBps)) / 10_000n;
        const payoutUnits = amountUnits - commissionUnits;
        const payoutTxHash = await sendUsdcPayout(seller.walletAddress, payoutUnits);
        await db.transactions.recordPayout(transactionId, payoutTxHash);
      } catch (err) {
        logUnexpectedError(`payout for transaction ${transactionId}`, err);
        await db.transactions.recordPayoutError(transactionId, err instanceof Error ? err.message : String(err));
      }
    } else {
      await db.transactions.recordPayoutError(
        transactionId,
        "Seller has no valid wallet address on file — payout is pending until one is set."
      );
    }
  }

  const final = (await db.transactions.getById(transactionId)) ?? initial;
  const segments = (await getContent(final.listingId)) ?? [];
  return NextResponse.json({ transaction: final, content: renderFullView(segments) });
}
