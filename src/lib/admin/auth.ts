export const ADMIN_COOKIE_NAME = "sellya_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Minimal session store for the admin panel — good enough to gate a
 * scaffold, not a real auth system. Sessions are in-memory (globalThis,
 * see src/lib/db for why) and vanish on restart. A real deployment needs
 * hashed passwords, rate limiting, and persisted sessions.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaAdminSessions: Set<string> | undefined;
}

function getSessions(): Set<string> {
  if (!globalThis.__sellyaAdminSessions) {
    globalThis.__sellyaAdminSessions = new Set();
  }
  return globalThis.__sellyaAdminSessions;
}

export function checkAdminPassword(password: string): boolean {
  // Falls back to an insecure default so the panel is reachable out of the
  // box — set ADMIN_PASSWORD before this goes anywhere near production.
  const expected = process.env.ADMIN_PASSWORD || "admin";
  return password === expected;
}

export function createAdminSession(): string {
  const token = crypto.randomUUID();
  getSessions().add(token);
  return token;
}

export function isValidAdminSession(token: string | undefined | null): boolean {
  return !!token && getSessions().has(token);
}

export function destroyAdminSession(token: string | undefined | null): void {
  if (token) getSessions().delete(token);
}

export const ADMIN_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
