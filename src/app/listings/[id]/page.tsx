import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getContent, renderFullView, renderPublicView } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { buildPublicExcerpt, jsonLdScript } from "@/lib/seo";
import { daysUntilExpiry } from "@/lib/listings/expiry";
import { StatusBadge, ContentStatsBadge } from "@/components/ui/Badge";
import { BuyButton } from "@/components/listings/BuyButton";
import { ClarificationForm } from "@/components/listings/ClarificationForm";
import { RenewButton } from "@/components/listings/RenewButton";
import { ShareBox } from "@/components/listings/ShareBox";
import type { RenderedSegment } from "@/types/content";

// Ownership-gated content view depends on the current session — must render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const listing = await db.listings.getById(params.id);
  if (!listing) return {};

  const segments = getContent(listing.id) ?? [];
  const description = buildPublicExcerpt(segments) || listing.summary;
  const indexable = listing.status === "approved";

  return {
    title: listing.title,
    description,
    alternates: { canonical: `/listings/${listing.id}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: listing.title,
      description,
      url: `/listings/${listing.id}`,
      type: "website",
    },
  };
}

function ContentView({ segments, revealed }: { segments: RenderedSegment[]; revealed: boolean }) {
  return (
    <div className="space-y-3">
      {segments.map((segment, i) =>
        segment.type === "public" ? (
          <p key={i} className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
            {segment.text}
          </p>
        ) : (
          <div
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              revealed ? "border-indigo-200 bg-indigo-50 text-gray-800" : "border-dashed border-gray-300 bg-gray-50 text-gray-500"
            }`}
          >
            {revealed ? (
              <p className="whitespace-pre-line">{segment.text}</p>
            ) : (
              <p>🔒 Locked — {segment.length} characters, unlocks after purchase</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const [listing, user] = await Promise.all([db.listings.getById(params.id), getCurrentUser()]);
  if (!listing) notFound();
  const isOwner = user?.id === listing.sellerId;

  const segments = getContent(listing.id) ?? [];
  const rendered = isOwner ? renderFullView(segments) : renderPublicView(segments);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: buildPublicExcerpt(segments, 300) || listing.summary,
    offers: {
      "@type": "Offer",
      price: (listing.priceCents / 100).toFixed(2),
      priceCurrency: listing.currency.toUpperCase(),
      availability: listing.status === "approved" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://sellya.info/listings/${listing.id}`,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={listing.status} />
        <ContentStatsBadge stats={listing.contentStats} />
        {isOwner && listing.status === "expired" && <RenewButton listingId={listing.id} label="Reactivate listing" />}
        {isOwner && listing.status === "approved" && (
          <span className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Expires in {daysUntilExpiry(listing.lastActivityAt)} day
              {daysUntilExpiry(listing.lastActivityAt) === 1 ? "" : "s"} without activity
            </span>
            <RenewButton listingId={listing.id} />
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{listing.title}</h1>
      <p className="mt-2 text-base text-gray-600">{listing.summary}</p>

      {listing.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {listing.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {listing.status === "approved" && (
        <div className="mt-4">
          <ShareBox
            url={`https://sellya.info/listings/${listing.id}`}
            title={listing.title}
            summary={listing.summary}
            variant={isOwner ? "owner" : "default"}
          />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <ContentView segments={rendered} revealed={isOwner} />
      </div>

      {isOwner && listing.status === "needs_info" && (
        <div className="mt-4">
          <ClarificationForm listing={listing} />
        </div>
      )}

      {listing.moderation?.summary && (
        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="text-sm font-medium text-brand-700">
            AI quality assessment{listing.moderation.qualityScore != null ? ` — ${listing.moderation.qualityScore}/10` : ""}
          </p>
          <p className="mt-1 text-sm text-gray-700">{listing.moderation.summary}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-2xl font-bold text-gray-900">{formatPrice(listing.priceCents, listing.currency)}</div>
        {listing.status === "approved" && !isOwner ? (
          <BuyButton listingId={listing.id} />
        ) : listing.status !== "approved" ? (
          <p className="text-sm text-gray-500">This listing isn&apos;t available for purchase yet.</p>
        ) : null}
      </div>
    </div>
  );
}
