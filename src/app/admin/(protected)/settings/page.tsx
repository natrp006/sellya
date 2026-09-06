"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface SettingsView {
  aiApiKeySet: boolean;
  aiApiKeyMasked: string | null;
  aiModel: string;
  commissionBps: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [commissionInput, setCommissionInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: SettingsView) => {
        setSettings(data);
        setModelInput(data.aiModel);
        setCommissionInput((data.commissionBps / 100).toString());
      })
      .catch(() => setError("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(apiKeyInput.trim() ? { aiApiKey: apiKeyInput.trim() } : {}),
          aiModel: modelInput,
          commissionBps: Math.round(Number(commissionInput) * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      setSettings(data);
      setApiKeyInput("");
      setMessage("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiApiKey: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not clear key");
      setSettings(data);
      setMessage("AI key cleared — moderation will fall back to the built-in heuristic.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Configure the AI moderation backend and commission rate. Stored in server memory only — see the README note
        on the in-memory store; this resets on restart.
      </p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="apiKey">
            Anthropic API key
          </label>
          <p className="mb-1.5 text-xs text-gray-500">
            {settings?.aiApiKeySet
              ? `Currently set: ${settings.aiApiKeyMasked}. Enter a new key to replace it, or leave blank to keep it.`
              : "Not set — listings are currently reviewed by the built-in heuristic, not a real AI."}
          </p>
          <input
            id="apiKey"
            type="password"
            placeholder="sk-ant-..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {settings?.aiApiKeySet && (
            <button
              type="button"
              onClick={handleClearKey}
              className="mt-1.5 text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear key (revert to heuristic)
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="model">
            Model
          </label>
          <input
            id="model"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="commission">
            Commission rate (%)
          </label>
          <input
            id="commission"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={commissionInput}
            onChange={(e) => setCommissionInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
