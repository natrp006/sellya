import { db } from "@/lib/db";
import { MarkReadButton } from "@/components/admin/MarkReadButton";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await db.contactMessages.listAll();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      <p className="mt-1 text-sm text-gray-600">
        Submissions from the public contact form — the only inbound support channel, since there are no accounts.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border p-4 text-sm ${
              m.status === "new" ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</span>
              {m.status === "new" ? (
                <MarkReadButton messageId={m.id} />
              ) : (
                <span className="text-xs text-gray-400">Read</span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-line text-gray-800">{m.message}</p>
            {m.contactInfo && (
              <p className="mt-2 text-xs text-gray-500">
                Reply to: <span className="font-mono">{m.contactInfo}</span>
              </p>
            )}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
      </div>
    </div>
  );
}
