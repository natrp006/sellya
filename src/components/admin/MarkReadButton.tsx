"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkReadButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    setSaving(true);
    try {
      await fetch(`/api/admin/messages/${messageId}/read`, { method: "POST" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={saving} className="text-xs font-medium text-brand-600 hover:text-brand-700">
      {saving ? "Marking..." : "Mark read"}
    </button>
  );
}
