"use client";

import { useState } from "react";

export function ShareBox({
  url,
  title,
  summary,
  variant = "default",
}: {
  url: string;
  title: string;
  summary: string;
  variant?: "default" | "owner";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) — the
      // link is still visible and selectable, so this fails silently.
    }
  }

  const shareText = `${title} — ${summary}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">
        {variant === "owner" ? "Promote your listing" : "Share this listing"}
      </p>
      {variant === "owner" && (
        <p className="mt-0.5 text-xs text-gray-500">
          SellYa doesn&apos;t sell traffic or ads — sharing this link yourself is how buyers find it.
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600"
        />
        <button
          onClick={handleCopy}
          className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
