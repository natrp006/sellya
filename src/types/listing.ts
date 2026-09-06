import type { ContentStats } from "./content";
import type { ModerationResult } from "./moderation";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "needs_info"
  | "approved"
  | "rejected"
  | "archived"
  | "expired";

export interface Clarification {
  question: string;
  answer: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  summary: string;
  tags: string[];
  priceCents: number;
  currency: string; // stablecoin ticker, e.g. "usdc"
  status: ListingStatus;
  moderation: ModerationResult | null;
  /** Public/locked character + segment counts — lets the UI show "2 sections locked" without exposing the actual content. */
  contentStats: ContentStats;
  /** Q&A history from AI-mediated clarification rounds, oldest first. */
  clarifications: Clarification[];
  /** Bumped by buyer interest (checkout started) or the seller engaging (renew, answering AI questions). Drives auto-expiry. */
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  sellerId: string;
  title: string;
  summary: string;
  tags: string[];
  priceCents: number;
  currency?: string;
  /**
   * The seller's full submission, required. Spans wrapped in {{double curly
   * braces}} become locked (paywalled) segments; everything else is public.
   * Parsed and persisted via src/lib/content — the platform needs to keep
   * the full unredacted content indefinitely to fulfill delivery on payment.
   */
  content: string;
}
