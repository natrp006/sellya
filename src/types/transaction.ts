export type EscrowStatus =
  | "awaiting_payment"
  | "funded"
  | "released"
  | "refunded"
  | "expired";

export interface Transaction {
  id: string;
  escrowId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  /**
   * Exact expected on-chain amount in USDC base units (6 decimals), as a
   * string (bigint isn't JSON-safe). Includes a small unique offset so
   * deposits to the shared treasury address can be matched to this specific
   * transaction — the buyer must send this exact amount, not the rounded price.
   */
  amountUnits: string;
  currency: string; // stablecoin ticker, e.g. "usdc"
  chain: string; // e.g. "base", "solana"
  depositAddress: string;
  commissionBps: number; // basis points, e.g. 2000 = 20%
  status: EscrowStatus;
  /** Set once a matching deposit is found on-chain. */
  buyerSendingAddress?: string;
  depositTxHash?: string;
  /** Set once the payout to the seller succeeds. */
  payoutTxHash?: string;
  /** Set if a payout attempt fails (e.g. seller has no valid wallet address) — status stays "funded" so it can be retried. */
  payoutError?: string;
  createdAt: string;
}
