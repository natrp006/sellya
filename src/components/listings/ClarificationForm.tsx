"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { Listing } from "@/types/listing";

export function ClarificationForm({
  listing,
  onUpdate,
}: {
  listing: Listing;
  onUpdate?: (listing: Listing) => void;
}) {
  const router = useRouter();
  const questions = listing.moderation?.questions ?? [];
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit answers");
      onUpdate?.(data.listing);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-sm font-medium text-orange-800">
        The AI reviewer needs more information before this listing can go live:
      </p>
      {questions.map((question, i) => (
        <div key={question}>
          <label className="mb-1 block text-sm font-medium text-gray-700">{question}</label>
          <textarea
            required
            rows={3}
            value={answers[i]}
            onChange={(e) =>
              setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit answers"}
      </Button>
    </form>
  );
}
