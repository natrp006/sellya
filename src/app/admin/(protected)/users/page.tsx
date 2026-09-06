import { db } from "@/lib/db";
import { WalletEditor } from "@/components/admin/WalletEditor";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await db.users.listAll();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <p className="mt-1 text-sm text-gray-600">
        Pseudonymous by design — no name or email is collected, only a handle and wallet address. A seller needs a
        valid wallet address here before any real payout can reach them.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Handle</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-none">
                <td className="px-4 py-3 font-medium text-gray-900">{u.handle}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <WalletEditor userId={u.id} currentAddress={u.walletAddress} />
                    {u.walletAddress && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.walletVerifiedAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {u.walletVerifiedAt ? "Verified" : "Unverified"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-gray-700">{u.role}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
