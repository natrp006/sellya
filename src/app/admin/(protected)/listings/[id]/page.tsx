import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getContent, renderFullView } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { StatusBadge, ContentStatsBadge } from "@/components/ui/Badge";
import { OverrideControls } from "@/components/admin/OverrideControls";

export const dynamic = "force-dynamic";

export default async function AdminListingDetailPage({ params }: { params: { id: string } }) {
  const listing = await db.listings.getById(params.id);
  if (!listing) notFound();

  const segments = renderFullView(getContent(listing.id) ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={listing.status} />
          <ContentStatsBadge stats={listing.contentStats} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {listing.summary} · {formatPrice(listing.priceCents, listing.currency)} · seller{" "}
          <span className="font-mono text-xs">{listing.sellerId}</span>
        </p>
      </div>

      <OverrideControls listingId={listing.id} />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Full content (admin view — locked segments unredacted)
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {segments.map((segment, i) => (
            <p
              key={i}
              className={`whitespace-pre-line text-sm leading-relaxed ${
                segment.type === "locked" ? "mb-2 rounded bg-indigo-50 p-2 text-indigo-900" : "mb-2 text-gray-800"
              }`}
            >
              {segment.type === "locked" && <span className="mr-1 text-xs font-semibold uppercase text-indigo-500">Locked</span>}
              {segment.text}
            </p>
          ))}
          {segments.length === 0 && <p className="text-sm text-gray-500">No content stored for this listing.</p>}
        </div>
      </div>

      {listing.moderation && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Latest AI moderation result</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <p>
              Verdict: <strong>{listing.moderation.verdict}</strong> · Confidence:{" "}
              {(listing.moderation.confidence * 100).toFixed(0)}%
              {listing.moderation.qualityScore != null && ` · Quality: ${listing.moderation.qualityScore}/10`}
            </p>
            {listing.moderation.summary && <p className="mt-1 text-gray-600">{listing.moderation.summary}</p>}
            {listing.moderation.reasons.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-gray-600">
                {listing.moderation.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {listing.moderation.questions.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-gray-600">
                {listing.moderation.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {listing.clarifications.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Clarification history</h2>
          <div className="flex flex-col gap-2">
            {listing.clarifications.map((c, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
                <p className="font-medium text-gray-900">Q: {c.question}</p>
                <p className="mt-1 text-gray-600">A: {c.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
