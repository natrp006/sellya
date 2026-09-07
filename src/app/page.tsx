import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ListingGrid } from "@/components/listings/ListingGrid";

// Listings change at runtime (new submissions, moderation outcomes) — this
// must render per-request, not be frozen as a static page at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell Any Information, Anonymously, for Crypto",
  description:
    "SellYa is an open marketplace for packaged information — side-hustle playbooks, sourcing methods, contact lists, niche know-how. List anything, get AI-reviewed, and choose how much buyers can read free before paying in crypto to unlock the rest.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const listings = await db.listings.list({ status: "approved" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="mb-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Sell what you know. Buy what actually works.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">
          SellYa is an open marketplace for packaged information — the specific process, contact, script, or
          number that makes something work, not another generic guide. If you&apos;ve built a profitable side
          hustle, found a reliable supplier, or worked out a method other people would pay to skip years of
          trial-and-error for, you can list it here anonymously and sell it for crypto.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">1. List anything</h2>
            <p className="mt-2 text-sm text-gray-600">
              No categories to squeeze into — just a title, tags, and your full write-up. Wrap whatever you want
              paywalled in <code className="rounded bg-gray-100 px-1">{"{{curly braces}}"}</code> — you can reveal
              100%, 0%, or anything in between. It&apos;s your call.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">2. AI reviews it</h2>
            <p className="mt-2 text-sm text-gray-600">
              Every listing is checked for policy violations and quality before it goes live. If something&apos;s
              missing or unclear, the AI asks directly — a listing only goes live once those questions are answered.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">3. Read before you buy</h2>
            <p className="mt-2 text-sm text-gray-600">
              Whatever a seller leaves public is free to read before you buy, so you&apos;re judging on what&apos;s
              actually shown, not trusting a score. Payment is stablecoin escrow, and the locked part is delivered
              automatically the moment it clears.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-600">
          No profiles, no personal brand required — both sides stay anonymous, just a wallet. You don&apos;t need
          an audience to sell what you know, and buyers judge the information on its merits, not who&apos;s
          selling it. Listing is free; SellYa only takes a commission when a sale actually happens.
        </p>

        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <h2 className="text-sm font-semibold text-brand-700">Sell it once. Sell it forever.</h2>
          <p className="mt-1 text-sm text-gray-700">
            Whatever&apos;s locked is delivered privately to each buyer — it&apos;s never published, even after
            someone pays for it, so the same listing can be sold to as many buyers as want it. And buyers
            can&apos;t turn around and resell what they bought: new listings are checked against everything
            already on SellYa, and anything that duplicates another seller&apos;s content is rejected. Only the
            original seller can keep selling what they know.
          </p>
        </div>
      </section>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Browse listings</h2>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Every listing below has passed automated AI moderation and quality review.
        </p>
      </div>
      <ListingGrid listings={listings} />
    </div>
  );
}
