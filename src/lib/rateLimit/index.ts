import { NextRequest, NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory fixed-window limiter, kept on globalThis for the same reason as
 * every other shared server-side state in this app (see src/lib/db) — each
 * Next.js route compiles into its own bundle. Resetting on restart is fine
 * here, unlike real data: a rate limit only needs to survive between
 * restarts, not across them.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaRateLimits: Map<string, Bucket> | undefined;
}

function getStore(): Map<string, Bucket> {
  if (!globalThis.__sellyaRateLimits) {
    globalThis.__sellyaRateLimits = new Map();
  }
  return globalThis.__sellyaRateLimits;
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** `key` should already include the route so different endpoints don't share a bucket. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Convenience wrapper for route handlers: returns a 429 response, or null if the request may proceed. */
export function checkRateLimit(
  request: NextRequest,
  routeKey: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIp(request);
  const result = rateLimit(`${routeKey}:${ip}`, limit, windowMs);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests — please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}
