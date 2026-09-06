import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@/types/user";

export const SESSION_COOKIE = "sellya_session";

/**
 * Stand-in for a real wallet-signature session. Identifies the current
 * visitor via a random cookie set by middleware (src/middleware.ts) on
 * every request, lazily creating a User record for it on first use — so
 * each browser gets its own distinct anonymous identity instead of
 * everyone sharing one. Every caller goes through this function so
 * swapping in real wallet-signature auth later doesn't require touching
 * pages or API routes.
 */
export async function getCurrentUser(): Promise<User | null> {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) return null; // shouldn't happen — middleware sets this on every request
  return db.users.getOrCreateBySessionId(sessionId);
}
