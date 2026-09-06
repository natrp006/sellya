export type ContentSegmentType = "public" | "locked";

/** One piece of a listing's authored content, as the seller wrote it. */
export interface ContentSegment {
  type: ContentSegmentType;
  text: string;
}

/** A segment as shown to someone who hasn't purchased — locked text is withheld, only its length survives. */
export interface RenderedSegment {
  type: ContentSegmentType;
  text: string | null;
  length: number;
}

export interface ContentStats {
  publicChars: number;
  lockedChars: number;
  lockedSegments: number;
}
