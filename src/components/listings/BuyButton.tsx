"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { EscrowIntent } from "@/lib/payments";
import type { RenderedSegment } from "@/types/content";

export function BuyButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false);
  const [escrow, setEscrow] = useState<EscrowIntent | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<RenderedSegment[] | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [waitingMessage, setWaitingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create escrow payment");
      setEscrow(data.escrow);
      setTransactionId(data.transactionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!transactionId) return;
    setLoading(true);
    setError(null);
    setWaitingMessage(null);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not check payment");

      if (data.status === "awaiting_payment") {
        setWaitingMessage(data.message);
        return;
      }

      setDelivered(data.content);
      setPayoutError(data.transaction?.payoutError ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (delivered) {
    return (
      <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">Payment confirmed on-chain — delivered</p>
        <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-800">
          {delivered.map((segment, i) => (
            <span key={i}>{segment.text}{" "}</span>
          ))}
        </div>
        {payoutError && (
          <p className="mt-3 text-xs text-amber-700">
            Note: the seller payout hasn&apos;t completed yet ({payoutError}). Your content is unaffected.
          </p>
        )}
      </div>
    );
  }

  if (escrow) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-4 sm:max-w-sm">
        <p className="text-sm font-medium text-gray-900">Send payment to escrow</p>
        <p className="mt-1 text-xs text-amber-700">
          Send the <strong>exact</strong> amount below — a rounded amount won&apos;t be detected.
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">Amount (exact)</dt>
            <dd className="font-mono font-medium text-gray-900">{escrow.amountDisplay} {escrow.token.toUpperCase()}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">Network</dt>
            <dd className="font-medium text-gray-900 capitalize">{escrow.chain}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-gray-500">Deposit address</dt>
            <dd className="break-all rounded bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-800">
              {escrow.depositAddress}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Checking on-chain..." : "Check for payment"}
          </Button>
          <p className="mt-1 text-xs text-gray-400">
            This queries the chain directly — click it once you&apos;ve sent the payment, and again after a minute
            if it's not detected yet.
          </p>
        </div>
        {waitingMessage && <p className="mt-2 text-sm text-amber-700">{waitingMessage}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button onClick={handleBuy} disabled={loading}>
        {loading ? "Creating escrow..." : "Buy with crypto"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
