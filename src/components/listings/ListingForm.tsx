"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ClarificationForm } from "@/components/listings/ClarificationForm";
import { ShareBox } from "@/components/listings/ShareBox";
import type { Listing } from "@/types/listing";

export function ListingForm({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      sellerId,
      title: String(form.get("title") ?? ""),
      summary: String(form.get("summary") ?? ""),
      tags,
      priceCents: Math.round(Number(form.get("price") ?? 0) * 100),
      content: String(form.get("content") ?? ""),
    };

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit listing");
      setResult(data.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (result && result.status === "needs_info") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Almost there</h2>
          <p className="mt-1 text-sm text-gray-600">
            Your listing isn&apos;t live yet — the AI reviewer has questions first.
          </p>
        </div>
        <ClarificationForm listing={result} onUpdate={setResult} />
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Listing submitted</h2>
        <p className="mt-2 text-sm text-gray-600">
          AI moderation verdict: <strong>{result.moderation?.verdict}</strong>
        </p>
        {result.moderation?.qualityScore != null && (
          <p className="mt-1 text-sm text-gray-600">Quality score: {result.moderation.qualityScore}/10</p>
        )}
        {result.moderation?.summary && (
          <p className="mt-1 text-sm text-gray-600">{result.moderation.summary}</p>
        )}
        {result.contentStats.lockedSegments > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            {result.contentStats.lockedSegments} section{result.contentStats.lockedSegments === 1 ? "" : "s"} locked —
            buyers unlock {result.contentStats.lockedChars} characters on purchase.
          </p>
        )}
        {result.moderation?.reasons && result.moderation.reasons.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
            {result.moderation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        {result.status === "approved" && (
          <div className="mt-4">
            <ShareBox
              url={`https://sellya.info/listings/${result.id}`}
              title={result.title}
              summary={result.summary}
              variant="owner"
            />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => router.push(`/listings/${result.id}`)}>View listing</Button>
          <Button variant="secondary" onClick={() => setResult(null)}>
            Submit another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="summary">
          Short summary
        </label>
        <input
          id="summary"
          name="summary"
          required
          maxLength={140}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="content">
          Content
        </label>
        <p className="mb-1.5 text-xs text-gray-500">
          Write the whole thing. Wrap the specific key detail(s) you want to sell in{" "}
          <code className="rounded bg-gray-100 px-1">{"{{double curly braces}}"}</code> — that part gets paywalled
          and delivered automatically on purchase. Everything else is shown publicly for free, so buyers can judge
          quality before paying.
        </p>
        <textarea
          id="content"
          name="content"
          required
          rows={10}
          placeholder={
            "Explain your method, process, or findings in full. Then wrap the one key detail you're actually selling, e.g.:\n\n...and that's the general approach. {{The exact supplier is Acme Corp, contact: jane@acme.example, ask for the wholesale tier.}}"
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="tags">
          Tags <span className="font-normal text-gray-400">(comma separated, optional)</span>
        </label>
        <input
          id="tags"
          name="tags"
          placeholder="side-hustle, dropshipping, outreach"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="price">
            Price (USDC)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min="1"
            step="0.01"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting for review..." : "Submit for AI review"}
      </Button>
    </form>
  );
}
