import type { ContentSegment } from "@/types/content";

/** Public-only excerpt for meta descriptions / JSON-LD — never includes locked text. */
export function buildPublicExcerpt(segments: ContentSegment[], maxLength = 160): string {
  const text = segments
    .filter((s) => s.type === "public")
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Safe to embed in a <script type="application/ld+json"> — escapes `<` so seller-authored text can't break out of the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
