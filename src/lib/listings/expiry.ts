export const LISTING_EXPIRY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
export const LISTING_EXPIRY_MS = LISTING_EXPIRY_DAYS * DAY_MS;

export function isInactiveTooLong(lastActivityAt: string): boolean {
  return Date.now() - new Date(lastActivityAt).getTime() > LISTING_EXPIRY_MS;
}

/** Whole days left before expiry; 0 once overdue. */
export function daysUntilExpiry(lastActivityAt: string): number {
  const elapsedMs = Date.now() - new Date(lastActivityAt).getTime();
  const remainingMs = LISTING_EXPIRY_MS - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}
