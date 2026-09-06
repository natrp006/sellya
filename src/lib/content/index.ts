import type { ContentSegment, ContentStats, RenderedSegment } from "@/types/content";

const LOCK_PATTERN = /\{\{([\s\S]*?)\}\}/g;

/**
 * Splits a seller's raw submission into public/locked segments using
 * {{double curly brace}} markers around the parts they want paywalled.
 * Everything outside a marker is public.
 */
export function parseContent(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LOCK_PATTERN.lastIndex = 0;
  while ((match = LOCK_PATTERN.exec(raw))) {
    const publicText = raw.slice(lastIndex, match.index);
    if (publicText.trim()) segments.push({ type: "public", text: publicText.trim() });

    const lockedText = match[1]?.trim() ?? "";
    if (lockedText) segments.push({ type: "locked", text: lockedText });

    lastIndex = LOCK_PATTERN.lastIndex;
  }

  const rest = raw.slice(lastIndex);
  if (rest.trim()) segments.push({ type: "public", text: rest.trim() });

  return segments;
}

export function computeContentStats(segments: ContentSegment[]): ContentStats {
  return segments.reduce<ContentStats>(
    (stats, segment) => {
      if (segment.type === "public") {
        stats.publicChars += segment.text.length;
      } else {
        stats.lockedChars += segment.text.length;
        stats.lockedSegments += 1;
      }
      return stats;
    },
    { publicChars: 0, lockedChars: 0, lockedSegments: 0 }
  );
}

/** What a non-buyer sees: public text as-is, locked text withheld (length only). */
export function renderPublicView(segments: ContentSegment[]): RenderedSegment[] {
  return segments.map((s) => ({
    type: s.type,
    text: s.type === "public" ? s.text : null,
    length: s.text.length,
  }));
}

/** The full deliverable: every segment unlocked. Only for the owner or a confirmed buyer. */
export function renderFullView(segments: ContentSegment[]): RenderedSegment[] {
  return segments.map((s) => ({ type: s.type, text: s.text, length: s.text.length }));
}

/** Plain-text concatenation of everything, for AI review — no {{markup}} artifacts. */
export function flattenForReview(segments: ContentSegment[]): string {
  return segments.map((s) => s.text).join("\n\n");
}

interface ContentStore {
  [listingId: string]: ContentSegment[];
}

/**
 * Persisted for the life of the listing — unlike the old review-only content
 * (discarded after moderation), this now has to survive indefinitely because
 * it's the actual deliverable released to buyers on payment. A real
 * implementation must encrypt this at rest and restrict access tightly; it's
 * now the single most sensitive thing the platform stores.
 *
 * Kept on globalThis rather than a plain module variable because Next.js
 * compiles each route into its own server bundle — see src/lib/db/index.ts.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaContentStore: ContentStore | undefined;
}

function getStore(): ContentStore {
  if (!globalThis.__sellyaContentStore) {
    globalThis.__sellyaContentStore = {};
  }
  return globalThis.__sellyaContentStore;
}

export function saveContent(listingId: string, segments: ContentSegment[]): void {
  getStore()[listingId] = segments;
}

export function getContent(listingId: string): ContentSegment[] | undefined {
  return getStore()[listingId];
}
