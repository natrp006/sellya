"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

function toHex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ConnectWalletButton({
  currentAddress,
  verified,
}: {
  currentAddress: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      if (!window.ethereum) {
        throw new Error("No wallet extension found — install MetaMask or a compatible wallet to continue.");
      }

      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No wallet account was returned.");

      const challengeRes = await fetch("/api/auth/wallet/challenge", { method: "POST" });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challengeData.error ?? "Could not start verification");

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [toHex(challengeData.message), address],
      })) as string;

      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, address }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "Could not verify signature");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">Payout wallet</p>
      {currentAddress ? (
        <p className="mt-1 break-all font-mono text-xs text-gray-600">
          {currentAddress}{" "}
          {verified ? (
            <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Verified
            </span>
          ) : (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Set by admin — unverified
            </span>
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-gray-500">No payout wallet on file yet.</p>
      )}
      <div className="mt-3">
        <Button variant="secondary" onClick={handleConnect} disabled={loading}>
          {loading ? "Check your wallet..." : currentAddress ? "Verify a different wallet" : "Connect & verify wallet"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">
        Signing proves you own this address — it costs no gas and doesn&apos;t send a transaction. This is the
        address any sales you make will be paid out to.
      </p>
    </div>
  );
}
