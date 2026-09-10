import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { flattenForReview, getContent } from "@/lib/content";
import { moderationService } from "@/lib/moderation";
import type { ListingStatus } from "@/types/listing";
import type { ModerationVerdict } from "@/types/moderation";

const TERMINAL_STATUS_BY_VERDICT: Record<ModerationVerdict, ListingStatus> = {
  approved: "approved",
  rejected: "rejected",
  needs_info: "needs_info",
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const listing = await db.listings.getById(params.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user || user.id !== listing.sellerId) {
    return NextResponse.json({ error: "Only the seller can respond to this listing's review" }, { status: 403 });
  }

  if (listing.status !== "needs_info" || !listing.moderation) {
    return NextResponse.json({ error: "This listing isn't awaiting clarification" }, { status: 400 });
  }

  const { answers } = (await request.json()) as { answers: string[] };
  const questions = listing.moderation.questions;

  if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((a) => !a.trim())) {
    return NextResponse.json(
      { error: `Expected ${questions.length} non-empty answer(s), one per outstanding question` },
      { status: 400 }
    );
  }

  const newClarifications = questions.map((question, i) => ({ question, answer: answers[i] ?? "" }));
  const allClarifications = [...listing.clarifications, ...newClarifications];
  const segments = (await getContent(listing.id)) ?? [];

  const moderation = await moderationService.reviewListing({
    title: listing.title,
    summary: listing.summary,
    tags: listing.tags,
    priceCents: listing.priceCents,
    content: flattenForReview(segments),
    lockedChars: listing.contentStats.lockedChars,
    clarifications: allClarifications,
  });

  const status = TERMINAL_STATUS_BY_VERDICT[moderation.verdict];
  const updated = await db.listings.respondToReview(listing.id, newClarifications, status, moderation);

  return NextResponse.json({ listing: updated });
}
