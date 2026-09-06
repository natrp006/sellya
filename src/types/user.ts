export type UserRole = "buyer" | "seller" | "admin";

/**
 * Users are pseudonymous by design — no real name or email is collected.
 * `handle` is a display-only generated label; `walletAddress` is how
 * payouts and escrow payments are actually routed.
 */
export interface User {
  id: string;
  handle: string;
  walletAddress: string | null;
  role: UserRole;
  createdAt: string;
}
