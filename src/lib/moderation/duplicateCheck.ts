import { db } from "@/lib/db";
import { flattenForReview, getContent } from "@/lib/content";

/**
 * Platform rule: a buyer who purchases information can't turn around and
 * relist it themselves — only the original seller may keep selling the same
 * content. This is a lightweight text-similarity check (shingle/Jaccard,
 * no external service), not true plagiarism detection: it catches
 * near-verbatim copy-paste, not a paraphrased rewrite. Good enough to deter
 * casual resale; a determined bad actor who rewrites the content in their
 * own words would still get through — worth knowing, not a reason to skip
 * this check, since it stops the easy case for free.
 */

const SHINGLE_WORD_COUNT = 8;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.6;

function shingles(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const result = new Set<string>();
  for (let i = 0; i <= words.length - SHINGLE_WORD_COUNT; i++) {
    result.add(words.slice(i, i + SHINGLE_WORD_COUNT).join(" "));
  }
  return result;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const shingle of a) {
    if (b.has(shingle)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateMatch {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  similarity: number;
}

/**
 * Compares new listing content against every existing listing NOT owned by
 * the same seller. Returns the closest match if it's over the threshold,
 * else null. O(n) over all listings per submission — fine at this scale,
 * would need real indexing (embeddings, a search index) at real volume.
 */
export async function findDuplicateContent(
  newContent: string,
  sellerId: string
): Promise<DuplicateMatch | null> {
  const newShingles = shingles(newContent);
  if (newShingles.size === 0) return null;

  // Only approved listings have any standing as "existing content to protect" —
  // comparing against a rejected listing would let a rejected fraudulent copy
  // poison the reference set and then falsely flag the legitimate original owner.
  const approvedListings = await db.listings.list({ status: "approved" });
  let best: DuplicateMatch | null = null;

  for (const listing of approvedListings) {
    if (listing.sellerId === sellerId) continue; // the original seller can always relist/resell their own info

    const segments = getContent(listing.id);
    if (!segments) continue;

    const similarity = jaccardSimilarity(newShingles, shingles(flattenForReview(segments)));
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { listingId: listing.id, listingTitle: listing.title, sellerId: listing.sellerId, similarity };
    }
  }

  return best;
}
