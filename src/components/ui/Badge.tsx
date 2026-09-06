import type { ListingStatus } from "@/types/listing";
import type { ContentStats } from "@/types/content";

const STYLES: Record<ListingStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-amber-100 text-amber-700",
  needs_info: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
  expired: "bg-slate-200 text-slate-600",
};

const LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending AI review",
  needs_info: "AI needs more info",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
  expired: "Expired",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}

export function ContentStatsBadge({ stats }: { stats: ContentStats }) {
  if (stats.lockedSegments === 0) {
    return (
      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
        Fully open — nothing locked
      </span>
    );
  }

  const total = stats.publicChars + stats.lockedChars;
  const publicPct = total > 0 ? Math.round((stats.publicChars / total) * 100) : 0;
  const label = `${publicPct}% shown free · ${stats.lockedSegments} locked section${stats.lockedSegments === 1 ? "" : "s"}`;

  return (
    <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
      {label}
    </span>
  );
}
