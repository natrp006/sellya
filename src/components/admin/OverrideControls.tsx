"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { ListingStatus } from "@/types/listing";

const OPTIONS: { status: ListingStatus; label: string; variant: "primary" | "secondary" }[] = [
  { status: "approved", label: "Force approve", variant: "primary" },
  { status: "rejected", label: "Force reject", variant: "secondary" },
  { status: "archived", label: "Archive", variant: "secondary" },
];

export function OverrideControls({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<ListingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOverride(status: ListingStatus) {
    setPending(status);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Override failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-gray-900">Admin override</p>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.status}
            variant={opt.variant}
            onClick={() => handleOverride(opt.status)}
            disabled={pending !== null}
          >
            {pending === opt.status ? "Applying..." : opt.label}
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
