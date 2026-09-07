import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>SellYa — anonymous, crypto-only. Every listing is screened by automated AI moderation before it goes live.</span>
        <Link href="/contact" className="font-medium text-gray-600 hover:text-brand-600">
          Contact
        </Link>
      </div>
    </footer>
  );
}
