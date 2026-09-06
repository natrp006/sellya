import { Prisma, type Listing as PrismaListing } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isInactiveTooLong } from "@/lib/listings/expiry";
import type { ContentStats } from "@/types/content";
import type { Clarification, CreateListingInput, Listing, ListingStatus } from "@/types/listing";
import type { ModerationResult } from "@/types/moderation";
import type { EscrowStatus, Transaction } from "@/types/transaction";
import type { User } from "@/types/user";

/**
 * Repository contracts. Backed by real Postgres via Prisma (see
 * prisma/schema.prisma) — this used to be an in-memory globalThis store,
 * which meant a restart lost every listing, transaction, and dollar of
 * tracked state. Same interfaces as before, so no caller had to change.
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
  respondToReview(
    id: string,
    newClarifications: Clarification[],
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null>;
  renew(id: string): Promise<Listing | null>;
  touchActivity(id: string): Promise<void>;
}

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  listAll(): Promise<User[]>;
  updateWalletAddress(id: string, walletAddress: string): Promise<User | null>;
  getOrCreateBySessionId(sessionId: string): Promise<User>;
  /** Issues a fresh single-use nonce for a wallet-signature challenge, replacing any prior one. */
  setWalletNonce(id: string, nonce: string, expiresAt: Date): Promise<void>;
  /** The outstanding challenge (if any) issued via setWalletNonce, for verifying a signature against. */
  getWalletNonce(id: string): Promise<{ nonce: string; expiresAt: Date } | null>;
  /** Verified wallet ownership: sets walletAddress + walletVerifiedAt and clears the nonce. */
  verifyWallet(id: string, walletAddress: string): Promise<User | null>;
}

export interface TransactionRepository {
  create(input: Omit<Transaction, "id" | "createdAt">): Promise<Transaction>;
  getById(id: string): Promise<Transaction | null>;
  updateStatus(id: string, status: EscrowStatus): Promise<Transaction | null>;
  recordDeposit(id: string, depositTxHash: string, buyerSendingAddress: string): Promise<Transaction | null>;
  recordPayout(id: string, payoutTxHash: string): Promise<Transaction | null>;
  recordPayoutError(id: string, message: string): Promise<Transaction | null>;
  listAll(): Promise<Transaction[]>;
  listByBuyer(buyerId: string): Promise<Transaction[]>;
}

function toListing(row: PrismaListing): Listing {
  return {
    id: row.id,
    sellerId: row.sellerId,
    title: row.title,
    summary: row.summary,
    tags: row.tags,
    priceCents: row.priceCents,
    currency: row.currency,
    status: row.status as ListingStatus,
    moderation: (row.moderation as unknown as ModerationResult) ?? null,
    contentStats: row.contentStats as unknown as ContentStats,
    clarifications: (row.clarifications as unknown as Clarification[]) ?? [],
    lastActivityAt: row.lastActivityAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * No background job runner exists, so expiry is checked lazily whenever a
 * listing is read rather than on a schedule (see src/lib/listings/expiry.ts)
 * — a real deployment would run this via cron instead, but the end result
 * is the same either way. Persists the flip immediately since Postgres is
 * now the actual source of truth, not a per-process cache.
 */
async function applyExpiry(row: PrismaListing): Promise<PrismaListing> {
  if (row.status === "approved" && isInactiveTooLong(row.lastActivityAt.toISOString())) {
    return prisma.listing.update({ where: { id: row.id }, data: { status: "expired" } });
  }
  return row;
}

class PrismaListingRepository implements ListingRepository {
  async list(filter?: { status?: ListingStatus }): Promise<Listing[]> {
    const rows = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
    const checked = await Promise.all(rows.map(applyExpiry));
    const result = filter?.status ? checked.filter((r) => r.status === filter.status) : checked;
    return result.map(toListing);
  }

  async listBySeller(sellerId: string): Promise<Listing[]> {
    const rows = await prisma.listing.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" } });
    const checked = await Promise.all(rows.map(applyExpiry));
    return checked.map(toListing);
  }

  async getById(id: string): Promise<Listing | null> {
    const row = await prisma.listing.findUnique({ where: { id } });
    if (!row) return null;
    return toListing(await applyExpiry(row));
  }

  async create(input: Omit<CreateListingInput, "content"> & { contentStats: ContentStats }): Promise<Listing> {
    const row = await prisma.listing.create({
      data: {
        sellerId: input.sellerId,
        title: input.title,
        summary: input.summary,
        tags: input.tags,
        priceCents: input.priceCents,
        currency: input.currency ?? "usdc",
        status: "pending_review",
        contentStats: input.contentStats as unknown as Prisma.InputJsonValue,
        clarifications: [] as unknown as Prisma.InputJsonValue,
      },
    });
    return toListing(row);
  }

  async updateStatus(
    id: string,
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null> {
    try {
      const row = await prisma.listing.update({
        where: { id },
        data: { status, moderation: (moderation ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue },
      });
      return toListing(row);
    } catch {
      return null;
    }
  }

  async respondToReview(
    id: string,
    newClarifications: Clarification[],
    status: ListingStatus,
    moderation: Listing["moderation"]
  ): Promise<Listing | null> {
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return null;
    const prior = (existing.clarifications as unknown as Clarification[]) ?? [];
    const row = await prisma.listing.update({
      where: { id },
      data: {
        clarifications: [...prior, ...newClarifications] as unknown as Prisma.InputJsonValue,
        status,
        moderation: (moderation ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
      },
    });
    return toListing(row);
  }

  async renew(id: string): Promise<Listing | null> {
    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await prisma.listing.update({
      where: { id },
      data: {
        lastActivityAt: new Date(),
        status: existing.status === "expired" ? "approved" : existing.status,
      },
    });
    return toListing(row);
  }

  async touchActivity(id: string): Promise<void> {
    await prisma.listing.update({ where: { id }, data: { lastActivityAt: new Date() } }).catch(() => {});
  }
}

function toUser(row: {
  id: string;
  handle: string;
  walletAddress: string | null;
  walletVerifiedAt: Date | null;
  role: string;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    handle: row.handle,
    walletAddress: row.walletAddress,
    walletVerifiedAt: row.walletVerifiedAt ? row.walletVerifiedAt.toISOString() : null,
    role: row.role as User["role"],
    createdAt: row.createdAt.toISOString(),
  };
}

class PrismaUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async listAll(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toUser);
  }

  async updateWalletAddress(id: string, walletAddress: string): Promise<User | null> {
    try {
      // Admin-set, not signature-proven — clears any prior verification of a different address.
      const row = await prisma.user.update({ where: { id }, data: { walletAddress, walletVerifiedAt: null } });
      return toUser(row);
    } catch {
      return null;
    }
  }

  async getOrCreateBySessionId(sessionId: string): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { id: sessionId } });
    if (existing) return toUser(existing);
    const created = await prisma.user.create({
      data: { id: sessionId, handle: `anon_${sessionId.slice(0, 6)}`, role: "seller" },
    });
    return toUser(created);
  }

  async setWalletNonce(id: string, nonce: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({ where: { id }, data: { walletNonce: nonce, walletNonceExpiresAt: expiresAt } });
  }

  async getWalletNonce(id: string): Promise<{ nonce: string; expiresAt: Date } | null> {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { walletNonce: true, walletNonceExpiresAt: true },
    });
    if (!row?.walletNonce || !row.walletNonceExpiresAt) return null;
    return { nonce: row.walletNonce, expiresAt: row.walletNonceExpiresAt };
  }

  async verifyWallet(id: string, walletAddress: string): Promise<User | null> {
    try {
      const row = await prisma.user.update({
        where: { id },
        data: {
          walletAddress,
          walletVerifiedAt: new Date(),
          walletNonce: null,
          walletNonceExpiresAt: null,
        },
      });
      return toUser(row);
    } catch {
      return null;
    }
  }
}

function toTransaction(row: {
  id: string;
  escrowId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  amountUnits: string;
  currency: string;
  chain: string;
  depositAddress: string;
  commissionBps: number;
  status: string;
  buyerSendingAddress: string | null;
  depositTxHash: string | null;
  payoutTxHash: string | null;
  payoutError: string | null;
  createdAt: Date;
}): Transaction {
  return {
    id: row.id,
    escrowId: row.escrowId,
    listingId: row.listingId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    amountCents: row.amountCents,
    amountUnits: row.amountUnits,
    currency: row.currency,
    chain: row.chain,
    depositAddress: row.depositAddress,
    commissionBps: row.commissionBps,
    status: row.status as EscrowStatus,
    buyerSendingAddress: row.buyerSendingAddress ?? undefined,
    depositTxHash: row.depositTxHash ?? undefined,
    payoutTxHash: row.payoutTxHash ?? undefined,
    payoutError: row.payoutError ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

class PrismaTransactionRepository implements TransactionRepository {
  async create(input: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
    const row = await prisma.transaction.create({
      data: {
        escrowId: input.escrowId,
        listingId: input.listingId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amountCents: input.amountCents,
        amountUnits: input.amountUnits,
        currency: input.currency,
        chain: input.chain,
        depositAddress: input.depositAddress,
        commissionBps: input.commissionBps,
        status: input.status,
      },
    });
    return toTransaction(row);
  }

  async getById(id: string): Promise<Transaction | null> {
    const row = await prisma.transaction.findUnique({ where: { id } });
    return row ? toTransaction(row) : null;
  }

  async updateStatus(id: string, status: EscrowStatus): Promise<Transaction | null> {
    try {
      const row = await prisma.transaction.update({ where: { id }, data: { status } });
      return toTransaction(row);
    } catch {
      return null;
    }
  }

  async recordDeposit(id: string, depositTxHash: string, buyerSendingAddress: string): Promise<Transaction | null> {
    try {
      const row = await prisma.transaction.update({
        where: { id },
        data: { status: "funded", depositTxHash, buyerSendingAddress },
      });
      return toTransaction(row);
    } catch {
      return null;
    }
  }

  async recordPayout(id: string, payoutTxHash: string): Promise<Transaction | null> {
    try {
      const row = await prisma.transaction.update({
        where: { id },
        data: { status: "released", payoutTxHash, payoutError: null },
      });
      return toTransaction(row);
    } catch {
      return null;
    }
  }

  async recordPayoutError(id: string, message: string): Promise<Transaction | null> {
    try {
      const row = await prisma.transaction.update({ where: { id }, data: { payoutError: message } });
      return toTransaction(row);
    } catch {
      return null;
    }
  }

  async listAll(): Promise<Transaction[]> {
    const rows = await prisma.transaction.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toTransaction);
  }

  async listByBuyer(buyerId: string): Promise<Transaction[]> {
    const rows = await prisma.transaction.findMany({ where: { buyerId }, orderBy: { createdAt: "desc" } });
    return rows.map(toTransaction);
  }
}

export const db = {
  listings: new PrismaListingRepository() as ListingRepository,
  users: new PrismaUserRepository() as UserRepository,
  transactions: new PrismaTransactionRepository() as TransactionRepository,
};
