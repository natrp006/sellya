"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WalletEditor({ userId, currentAddress }: { userId: string; currentAddress: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentAddress ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-500">{currentAddress ?? "Not set"}</span>
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0x..."
          className="w-56 rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:border-brand-500 focus:outline-none"
        />
        <button onClick={handleSave} disabled={saving} className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
