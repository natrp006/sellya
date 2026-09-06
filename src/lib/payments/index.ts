import { centsToUsdcUnits, getTreasuryAddress, usdcUnitsToDisplay } from "@/lib/chain";
import { getSettings } from "@/lib/settings";
import type { Listing } from "@/types/listing";
import type { User } from "@/types/user";

export const DEFAULT_CHAIN = "base";

export interface EscrowIntent {
  escrowId: string;
  depositAddress: string;
  chain: string;
  token: string; // e.g. "usdc"
  amountCents: number;
  /** Exact USDC base units (6 decimals) the buyer must send — includes a unique offset, not just the rounded price. */
  amountUnits: string;
  /** Human-readable version of amountUnits for display, e.g. "49.000417". */
  amountDisplay: string;
  commissionBps: number;
  expiresAt: string;
}

/**
 * Custodial escrow: every buyer sends to the same treasury address, so the
 * exact amount (price + a small unique offset) is what disambiguates one
 * transaction's deposit from another's. Swap this for a smart-contract
 * escrow later without changing callers — they only depend on this
 * interface, not how the deposit address/amount get produced.
 */
export interface PaymentService {
  createEscrowIntent(listing: Listing, buyer: User): Promise<EscrowIntent>;
}

class TreasuryPaymentService implements PaymentService {
  async createEscrowIntent(listing: Listing): Promise<EscrowIntent> {
    const treasuryAddress = getTreasuryAddress();
    if (!treasuryAddress) {
      throw new Error("Payments aren't configured yet — TREASURY_PRIVATE_KEY is unset.");
    }

    const baseUnits = centsToUsdcUnits(listing.priceCents);
    // Up to $0.000999 — negligible economically, but means two buyers of the
    // same-priced listing still get separately matchable deposit amounts.
    const uniqueOffset = BigInt(Math.floor(Math.random() * 1000));
    const amountUnits = baseUnits + uniqueOffset;

    return {
      escrowId: `escrow_${crypto.randomUUID().slice(0, 8)}`,
      depositAddress: treasuryAddress,
      chain: DEFAULT_CHAIN,
      token: listing.currency,
      amountCents: listing.priceCents,
      amountUnits: amountUnits.toString(),
      amountDisplay: usdcUnitsToDisplay(amountUnits),
      commissionBps: (await getSettings()).commissionBps,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }
}

export const paymentService: PaymentService = new TreasuryPaymentService();
