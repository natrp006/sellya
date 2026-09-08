import { Prisma } from "@prisma/client";

/** Prisma's "record to update/delete does not exist" — an expected outcome (e.g. a stale id), not a bug. */
function isRecordNotFound(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

/**
 * Logs to the server console (visible via `railway logs`) so failures that
 * would otherwise be swallowed by a `catch { return null }` are still
 * visible somewhere. Stays quiet for Prisma's not-found error specifically,
 * since that's a normal outcome (a stale or already-deleted id), not a
 * defect — logging it as an "error" on every occurrence would bury the
 * failures that actually matter.
 */
export function logUnexpectedError(context: string, err: unknown): void {
  if (isRecordNotFound(err)) return;
  console.error(`[${context}]`, err);
}
