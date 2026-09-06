import { PrismaClient } from "@prisma/client";

/**
 * Kept on globalThis rather than a plain module-scope variable for the same
 * reason as the old in-memory store (see git history / README): Next.js
 * compiles each route into its own server bundle, so a plain variable isn't
 * reliably shared — and for a real connection pool, that would mean a
 * separate pool per bundle instead of one shared pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__sellyaPrisma ?? new PrismaClient();
globalThis.__sellyaPrisma = prisma;
