import { computeContentStats, parseContent, saveContent } from "@/lib/content";
import { isInactiveTooLong } from "@/lib/listings/expiry";
import type { ContentStats } from "@/types/content";
import type { Clarification, CreateListingInput, Listing, ListingStatus } from "@/types/listing";
import type { EscrowStatus, Transaction } from "@/types/transaction";
import type { User } from "@/types/user";

/**
 * Repository contracts. Swap the in-memory implementations below for real
 * Postgres/Supabase/etc-backed ones without touching any route or page.
 */
export interface ListingRepository {
  list(filter?: { status?: ListingStatus }): Promise<Listing[]>;
  listBySeller(sellerId: string): Promise<Listing[]>;
  getById(id: string): Promise<Listing | null>;
  create(input: Omit<CreateListingInput, "content"> & { contentStats: ContentStats }): Promise<Listing>;
  updateStatus(
    id: string,
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null>;
  /** Appends a clarification round's Q&A pairs, then applies the re-review outcome. */
  respondToReview(
    id: string,
    newClarifications: Clarification[],
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null>;
  /** Seller-triggered: resets the inactivity clock and un-expires the listing if needed. */
  renew(id: string): Promise<Listing | null>;
  /** Bumps the inactivity clock without changing status — for buyer/seller engagement that isn't a full renew. */
  touchActivity(id: string): Promise<void>;
}

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  listAll(): Promise<User[]>;
  updateWalletAddress(id: string, walletAddress: string): Promise<User | null>;
  /** Looks up the user for an anonymous session cookie, creating one on first visit. */
  getOrCreateBySessionId(sessionId: string): Promise<User>;
}

export interface TransactionRepository {
  create(input: Omit<Transaction, "id" | "createdAt">): Promise<Transaction>;
  getById(id: string): Promise<Transaction | null>;
  updateStatus(id: string, status: EscrowStatus): Promise<Transaction | null>;
  /** A matching on-chain deposit was found — moves to "funded" and records who sent it. */
  recordDeposit(id: string, depositTxHash: string, buyerSendingAddress: string): Promise<Transaction | null>;
  /** The payout to the seller succeeded — moves to "released". */
  recordPayout(id: string, payoutTxHash: string): Promise<Transaction | null>;
  /** The payout attempt failed — status stays "funded" (buyer already got the content) so it can be retried. */
  recordPayoutError(id: string, message: string): Promise<Transaction | null>;
  listAll(): Promise<Transaction[]>;
  listByBuyer(buyerId: string): Promise<Transaction[]>;
}

const now = () => new Date().toISOString();

interface Store {
  listings: Listing[];
  users: User[];
  transactions: Transaction[];
  idCounter: number;
}

/**
 * Next.js compiles each route (API handlers, server-rendered pages) into
 * its own server bundle, so a plain module-scope variable here is NOT
 * reliably shared across routes — each can end up with its own copy of
 * this module. `globalThis` is the one thing every bundle running in the
 * same Node process actually shares, so the in-memory data lives there
 * instead. A real database wouldn't need this — it's a workaround specific
 * to using process memory as a stand-in store.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaStore: Store | undefined;
}

function seedListing(
  id: string,
  sellerId: string,
  title: string,
  summary: string,
  tags: string[],
  priceCents: number,
  rawContent: string,
  qualityScore: number
): Listing {
  const segments = parseContent(rawContent);
  saveContent(id, segments);
  return {
    id,
    sellerId,
    title,
    summary,
    tags,
    priceCents,
    currency: "usdc",
    status: "approved",
    moderation: {
      verdict: "approved",
      reasons: [],
      questions: [],
      qualityScore,
      summary: "Reviewed the seller's full submitted content for structure, specificity, and depth.",
      confidence: 0.9,
      reviewedAt: now(),
    },
    contentStats: computeContentStats(segments),
    clarifications: [],
    lastActivityAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };
}

/**
 * No background job runner exists in this scaffold, so expiry is checked
 * lazily whenever a listing is read rather than on a schedule — a real
 * deployment would run this via a cron job instead, but the end result
 * (an inactive listing stops being approved) is the same either way.
 */
function applyExpiry(listing: Listing): Listing {
  if (listing.status === "approved" && isInactiveTooLong(listing.lastActivityAt)) {
    listing.status = "expired";
    listing.updatedAt = now();
  }
  return listing;
}

function createSeedStore(): Store {
  return {
    idCounter: 3,
    listings: [
      seedListing(
        "listing_1",
        "user_seed_1",
        "The Facebook Ad Setup I Use for Sub-$15 Plumbing Leads",
        "Campaign structure, targeting, and ad copy that consistently produces cheap, qualified leads for local home-service businesses.",
        ["marketing", "facebook-ads", "local-business"],
        2500,
        "This is the exact Facebook ad campaign structure I've used to keep cost-per-lead under $15 for local plumbing and HVAC businesses. The setup uses a two-stage funnel: a broad awareness campaign targeting homeowners in a 15-mile radius aged 30-65, followed by a retargeting campaign to anyone who watched at least 50% of the first video. Both campaigns run on a daily budget split roughly 70/30 between awareness and retargeting, adjusted weekly based on cost-per-lead. The creative angle that consistently outperforms generic \"call us today\" ads is a before/after problem-solving format shot on a phone, not professionally produced. {{Exact budget split, bid strategy, and the specific ad copy/headlines that produced our best-performing campaigns, word for word.}}",
        8
      ),
      seedListing(
        "listing_2",
        "user_seed_2",
        "My Quote Calculator for Residential Solar Installs",
        "Enter system size, labor, and materials — get a customer-facing quote with margin already built in.",
        ["solar", "pricing", "calculator"],
        1500,
        "This is the pricing logic I use to quote residential solar installs without underbidding myself. The general approach: take the system size in kilowatts, multiply by a base cost-per-watt that accounts for panel type and labor complexity, add a fixed permitting/inspection fee, then apply a margin that scales down slightly as system size increases (larger jobs can carry a thinner percentage margin and still be profitable). The calculator also flags jobs where roof complexity or panel count pushes labor hours past a threshold, so you know to quote higher before you're locked in. {{The exact cost-per-watt figures, fixed fee amounts, and margin percentages by system size tier that the calculator uses.}}",
        7
      ),
      seedListing(
        "listing_3",
        "user_seed_3",
        "The Wholesale Coffee Bean Supplier I Use — No Distributor Markup",
        "Direct import contact, minimum order quantities, and per-kilogram pricing for restaurant-grade beans.",
        ["sourcing", "coffee", "wholesale"],
        2000,
        "How I source restaurant-grade coffee beans directly from an importer instead of going through a distributor, cutting my per-kilogram cost significantly. The process: importers who deal in green (unroasted) coffee sell in bulk lots, and most have a minimum order quantity that's much lower than people assume — small cafes and roasters can qualify without needing warehouse-scale volume. I vetted suppliers by requesting sample lots first, checking their sourcing certifications, and confirming shipping/customs handling before committing to a full order. {{The specific importer's name, contact details, minimum order quantity, and current per-kilogram pricing.}}",
        8
      ),
    ],
    users: [
      // No wallet address until set for real via /admin/users — a stub
      // address would look valid enough to attempt a real payout to it.
      { id: "user_seed_1", handle: "anon_seed1", walletAddress: null, role: "seller", createdAt: now() },
      { id: "user_seed_2", handle: "anon_seed2", walletAddress: null, role: "seller", createdAt: now() },
      { id: "user_seed_3", handle: "anon_seed3", walletAddress: null, role: "seller", createdAt: now() },
    ],
    transactions: [],
  };
}

function getStore(): Store {
  if (!globalThis.__sellyaStore) {
    globalThis.__sellyaStore = createSeedStore();
  }
  return globalThis.__sellyaStore;
}

function nextId(prefix: string): string {
  const store = getStore();
  store.idCounter += 1;
  return `${prefix}_${store.idCounter}`;
}

class InMemoryListingRepository implements ListingRepository {
  async list(filter?: { status?: ListingStatus }): Promise<Listing[]> {
    const { listings } = getStore();
    listings.forEach(applyExpiry);
    if (!filter?.status) return [...listings];
    return listings.filter((l) => l.status === filter.status);
  }

  async listBySeller(sellerId: string): Promise<Listing[]> {
    return getStore()
      .listings.filter((l) => l.sellerId === sellerId)
      .map(applyExpiry);
  }

  async getById(id: string): Promise<Listing | null> {
    const listing = getStore().listings.find((l) => l.id === id);
    return listing ? applyExpiry(listing) : null;
  }

  async create(input: Omit<CreateListingInput, "content"> & { contentStats: ContentStats }): Promise<Listing> {
    const listing: Listing = {
      id: nextId("listing"),
      sellerId: input.sellerId,
      title: input.title,
      summary: input.summary,
      tags: input.tags,
      priceCents: input.priceCents,
      currency: input.currency ?? "usdc",
      status: "pending_review",
      moderation: null,
      contentStats: input.contentStats,
      clarifications: [],
      lastActivityAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    getStore().listings.unshift(listing);
    return listing;
  }

  async updateStatus(
    id: string,
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null> {
    const listing = getStore().listings.find((l) => l.id === id);
    if (!listing) return null;
    listing.status = status;
    listing.moderation = moderation;
    listing.updatedAt = now();
    return listing;
  }

  async respondToReview(
    id: string,
    newClarifications: Clarification[],
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null> {
    const listing = getStore().listings.find((l) => l.id === id);
    if (!listing) return null;
    listing.clarifications = [...listing.clarifications, ...newClarifications];
    listing.status = status;
    listing.moderation = moderation;
    listing.lastActivityAt = now();
    listing.updatedAt = now();
    return listing;
  }

  async renew(id: string): Promise<Listing | null> {
    const listing = getStore().listings.find((l) => l.id === id);
    if (!listing) return null;
    listing.lastActivityAt = now();
    if (listing.status === "expired") {
      listing.status = "approved";
    }
    listing.updatedAt = now();
    return listing;
  }

  async touchActivity(id: string): Promise<void> {
    const listing = getStore().listings.find((l) => l.id === id);
    if (listing) listing.lastActivityAt = now();
  }
}

class InMemoryUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    return getStore().users.find((u) => u.id === id) ?? null;
  }

  async listAll(): Promise<User[]> {
    return [...getStore().users];
  }

  async updateWalletAddress(id: string, walletAddress: string): Promise<User | null> {
    const user = getStore().users.find((u) => u.id === id);
    if (!user) return null;
    user.walletAddress = walletAddress;
    return user;
  }

  async getOrCreateBySessionId(sessionId: string): Promise<User> {
    const store = getStore();
    let user = store.users.find((u) => u.id === sessionId);
    if (!user) {
      user = {
        id: sessionId,
        handle: `anon_${sessionId.slice(0, 6)}`,
        walletAddress: null,
        role: "seller",
        createdAt: now(),
      };
      store.users.push(user);
    }
    return user;
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  async create(input: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
    const transaction: Transaction = {
      ...input,
      id: nextId("txn"),
      createdAt: now(),
    };
    getStore().transactions.push(transaction);
    return transaction;
  }

  async getById(id: string): Promise<Transaction | null> {
    return getStore().transactions.find((t) => t.id === id) ?? null;
  }

  async listAll(): Promise<Transaction[]> {
    return [...getStore().transactions];
  }

  async updateStatus(id: string, status: EscrowStatus): Promise<Transaction | null> {
    const transaction = getStore().transactions.find((t) => t.id === id);
    if (!transaction) return null;
    transaction.status = status;
    return transaction;
  }

  async recordDeposit(id: string, depositTxHash: string, buyerSendingAddress: string): Promise<Transaction | null> {
    const transaction = getStore().transactions.find((t) => t.id === id);
    if (!transaction) return null;
    transaction.status = "funded";
    transaction.depositTxHash = depositTxHash;
    transaction.buyerSendingAddress = buyerSendingAddress;
    return transaction;
  }

  async recordPayout(id: string, payoutTxHash: string): Promise<Transaction | null> {
    const transaction = getStore().transactions.find((t) => t.id === id);
    if (!transaction) return null;
    transaction.status = "released";
    transaction.payoutTxHash = payoutTxHash;
    transaction.payoutError = undefined;
    return transaction;
  }

  async recordPayoutError(id: string, message: string): Promise<Transaction | null> {
    const transaction = getStore().transactions.find((t) => t.id === id);
    if (!transaction) return null;
    transaction.payoutError = message;
    return transaction;
  }

  async listByBuyer(buyerId: string): Promise<Transaction[]> {
    return getStore().transactions.filter((t) => t.buyerId === buyerId);
  }
}

export const db = {
  listings: new InMemoryListingRepository() as ListingRepository,
  users: new InMemoryUserRepository() as UserRepository,
  transactions: new InMemoryTransactionRepository() as TransactionRepository,
};
