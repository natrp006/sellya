import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeContentStats, flattenForReview, parseContent, saveContent } from "@/lib/content";
import { moderationService } from "@/lib/moderation";
import { findDuplicateContent } from "@/lib/moderation/duplicateCheck";
import type { CreateListingInput, ListingStatus } from "@/types/listing";
import type { ModerationVerdict } from "@/types/moderation";

const VALID_STATUSES: ListingStatus[] = [
  "draft",
  "pending_review",
  "needs_info",
  "approved",
  "rejected",
  "archived",
];

const TERMINAL_STATUS_BY_VERDICT: Record<ModerationVerdict, ListingStatus> = {
  approved: "approved",
  rejected: "rejected",
  needs_info: "needs_info",
};

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as ListingStatus)
    ? (statusParam as ListingStatus)
    : undefined;
  const listings = await db.listings.list(status ? { status } : undefined);
  return NextResponse.json({ listings });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateListingInput;

  if (!body.title || !body.summary || !body.sellerId || !body.content?.trim()) {
    return NextResponse.json(
      { error: "title, summary, sellerId, and content are required" },
      { status: 400 }
    );
  }

  const segments = parseContent(body.content);
  const contentStats = computeContentStats(segments);

  const { content, ...listingInput } = body;
  const listing = await db.listings.create({ ...listingInput, contentStats });
  await saveContent(listing.id, segments);

  const flatContent = flattenForReview(segments);

  // Anti-resale rule: only the original seller may sell this information —
  // a buyer relisting what they bought gets rejected outright, no AI call needed.
  const duplicate = await findDuplicateContent(flatContent, listing.sellerId);
  if (duplicate) {
    const moderation = {
      verdict: "rejected" as const,
      reasons: [
        `This content appears to duplicate an existing listing ("${duplicate.listingTitle}") from another seller (${Math.round(duplicate.similarity * 100)}% similar). Reselling or relisting someone else's information isn't allowed — only the original seller can list this content.`,
      ],
      questions: [],
      qualityScore: null,
      summary: null,
      confidence: 0.8,
      reviewedAt: new Date().toISOString(),
    };
    const updated = await db.listings.updateStatus(listing.id, "rejected", moderation);
    return NextResponse.json({ listing: updated }, { status: 201 });
  }

  const moderation = await moderationService.reviewListing({
    title: listing.title,
    summary: listing.summary,
    tags: listing.tags,
    priceCents: listing.priceCents,
    content: flatContent,
    lockedChars: contentStats.lockedChars,
    clarifications: [],
  });

  const status = TERMINAL_STATUS_BY_VERDICT[moderation.verdict];
  const updated = await db.listings.updateStatus(listing.id, status, moderation);

  return NextResponse.json({ listing: updated }, { status: 201 });
}
