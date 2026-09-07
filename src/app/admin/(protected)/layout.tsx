import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { LogoutButton } from "@/components/admin/LogoutButton";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token)) {
    redirect("/admin/login");
  }

  const messages = await db.contactMessages.listAll();
  const unreadCount = messages.filter((m) => m.status === "new").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-4">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-gray-700 hover:text-brand-600">
              {item.label}
              {item.href === "/admin/messages" && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}
