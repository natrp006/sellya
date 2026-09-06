# SellYa (sellya.info)

An open, anonymous marketplace for selling any information someone else
might find useful — side-hustle playbooks, processes, contact lists, niche
know-how. No forced categories: sellers describe what they're selling in
free text and tags. Buyers pay in stablecoins into escrow, and the platform
delivers the paid content automatically — sellers never hand anything over
manually. Every listing is screened by AI moderation before it can go live.

This repo is currently a **structural scaffold**: the marketplace
mechanics are fully wired end-to-end, but the underlying services
(database, auth, payments, moderation) are stub/in-memory implementations
meant to be swapped for real ones.

## Product model

- **Open, uncategorized listings.** No category tree — just a title, a
  short summary, tags, and the content itself. Discovery is via search/tags
  today; a "request for information" board and trending/recent sections are
  planned but not yet built.
- **The platform doesn't sell traffic or an audience — sellers bring their
  own.** SellYa isn't building ads or content-marketing-driven discovery;
  each listing has a `ShareBox` (copy link + X/Reddit/WhatsApp/Telegram
  intents) so sellers can promote their own listing wherever their audience
  already is. Shared links get a real title/description/preview since
  per-listing metadata is already solid (see SEO section).
- **Fully anonymous.** No real name or email anywhere. Users are identified
  by a generated handle and a wallet address (`src/types/user.ts`).
- **Content is public-by-default, seller-locked where it matters.** Sellers
  write their full submission and wrap only the specific key detail(s) they
  want to sell — a supplier contact, an exact number, a script — in
  `{{double curly braces}}`. Everything else is shown to every visitor for
  free, so buyers can judge real quality before paying instead of trusting
  an opaque score. See `src/lib/content/index.ts`.
- **The platform holds the full content and delivers it automatically.**
  The seller uploads the complete unredacted submission up front; there's
  no manual "seller sends the buyer a file" step. On payment, the platform
  releases the locked segment(s) itself. This means the persisted content
  store (`src/lib/content`) is now the single most sensitive thing the
  platform holds — a real implementation must encrypt it at rest and
  restrict access tightly. Because the locked detail is only ever delivered
  privately (never published, even after a sale), a listing can be sold to
  as many buyers as want it — nothing marks it "sold out" after one purchase.
- **Only the original seller can sell a given piece of information — buyers
  can't resell what they bought.** New submissions are checked against every
  *approved* listing not owned by the same seller (`src/lib/moderation/duplicateCheck.ts`,
  a dependency-free shingle/Jaccard text-similarity check); a strong match
  gets rejected outright, no AI call needed. This is a lightweight heuristic,
  not real plagiarism detection — it catches near-verbatim copy-paste (the
  realistic "pasted what I bought" case), not a deliberately reworded rewrite.
  Comparing only against `approved` listings is deliberate: an early version
  compared against listings of any status and a rejected fraudulent copy
  could "poison" the reference set and falsely flag the legitimate original
  seller — worth remembering if this gets touched again.
- **Crypto-only, escrow-based payments — genuinely on-chain, not a stub.**
  Buyer sends real USDC on Base to the platform's treasury wallet → the
  backend verifies the deposit on-chain (not a trusted client claim) →
  content is delivered → the platform automatically signs and sends the
  seller their cut (minus commission). See "Real payments" below.
- **Commission-based monetization.** Listing is free; the platform takes a
  cut on completed sales, editable at runtime from `/admin/settings`
  (default 20%, `src/lib/settings/index.ts`).
- **AI-mediated listing creation, not single-shot moderation.** On
  submission the AI runs mandatory policy checks plus quality assessment.
  If something's missing or ambiguous — no consent confirmation on a
  listing that mentions a contact/lead list, content too thin to assess,
  or nothing marked as locked on a paid listing — it responds with
  specific questions instead of approving or rejecting outright. The
  listing sits in `needs_info`, invisible to buyers, until the seller
  answers (on the listing page or right after submitting). Only once the
  AI has no more questions does a listing reach `approved`. Rounds are
  capped (`MAX_CLARIFICATION_ROUNDS`) — unresolved after that, it's
  rejected rather than left open indefinitely. See `src/lib/moderation`.
- **Real AI moderation when a key is configured.** Paste an Anthropic API
  key into `/admin/settings` and every review call goes to a real Claude
  model instead of the built-in heuristic; clear the key (or leave it
  unset) to fall back to the heuristic. Any API failure — bad key, network
  error, an unparseable response — is caught and falls back to the
  heuristic automatically so a bad key never breaks listing submission.
- **Listings auto-expire after 30 days of no activity** (`LISTING_EXPIRY_DAYS`
  in `src/lib/listings/expiry.ts`). "Activity" is a buyer starting checkout
  or the seller engaging (answering AI questions, clicking renew) — see
  `lastActivityAt` on `Listing`. There's no background job runner in this
  scaffold, so expiry is checked lazily whenever a listing is read
  (`applyExpiry` in `src/lib/db/index.ts`) rather than on a schedule; a real
  deployment would run this via cron instead, but the visible behavior is
  the same either way. Sellers get a one-click "Keep active" button on
  their dashboard and on the listing page itself — no need to edit or
  resubmit anything to reset the clock.

## Real payments (Base mainnet, custodial)

This is genuinely live — not simulated — as of 2026-08-29. Real USDC moves.

**How it works:** one treasury wallet (its private key set as the
`TREASURY_PRIVATE_KEY` env var — never in code, never in this repo) receives
every deposit. Because everyone sends to the *same* address, each buyer is
asked to send an amount with a small unique offset over the listed price
(e.g. `49.000417` instead of `49.00`) — `src/lib/payments/index.ts` generates
this, and the deposit-matching logic in `src/lib/chain/index.ts` scans
on-chain `Transfer` events to the treasury address for that exact amount.
This is *not* a smart contract — the trust model is "you trust how the
platform secures that one private key." That trade-off was made deliberately
to get something real working quickly; a contract-based escrow is the
long-term answer (see "Not yet decided").

**The flow**, in `src/app/api/transactions/[id]/confirm/route.ts`:
1. Buyer sends the exact amount shown in `BuyButton.tsx` to the treasury address.
2. Clicking "Check for payment" queries the chain directly for a matching
   `Transfer` log — this is a real on-chain check, not a trusted client claim.
3. Once found, content is delivered to the buyer immediately (payment is
   genuinely verified) — regardless of what happens next.
4. Separately, the platform automatically signs and broadcasts a payout to
   the seller's registered wallet (price minus commission). If the seller
   has no valid wallet address on file, this fails safely: the buyer isn't
   blocked, and re-clicking "Check for payment" later retries the payout.

**Setup required before this works at all:**
- `TREASURY_PRIVATE_KEY` set on the host (never committed, never pasted into
  chat with an AI assistant — see the note in `src/lib/chain/index.ts`).
  That wallet needs real ETH on Base (for gas) and, to receive real sales,
  real USDC.
- Each seller needs a real wallet address set via `/admin/users` before any
  payout can reach them — seed users start with no wallet address on
  purpose (a stub-looking address would look valid enough to attempt a real
  transfer to nowhere).
- `/admin` → Overview shows live treasury ETH/USDC balances, or "Not
  configured" if the key isn't set.

**Known limitations, explicitly not fixed for v1:**
- The in-memory store (see below) means a server restart mid-transaction
  loses the record of "expecting this exact amount" — the funds are still
  safely in the treasury wallet, but automatic matching breaks; a real
  deployment needs a persisted store before this is trustworthy at volume.
- Matching is a brute-force log scan over a bounded block range, not a real
  indexer or webhook — fine at low volume, not how this should work long-term.
- No refund flow yet, even though the buyer's sending address is captured
  from the on-chain log.
- The unique-offset scheme has a small (currently ~1-in-1000) chance of two
  concurrent buyers colliding on the same amount.

## Admin panel (`/admin`)

Password-gated (`ADMIN_PASSWORD` env var; falls back to the literal string
`admin` if unset — **change this before deploying anywhere real**, it's a
placeholder single shared password with no rate limiting, not real auth).

- **Overview** — listing counts by status, transaction volume/commission
  revenue, whether AI moderation is live or on the heuristic fallback.
- **Listings** — every listing regardless of status, drilling into a detail
  view that shows the *full unredacted content* (locked segments included)
  plus the AI's moderation reasoning and clarification history, with
  buttons to force-approve/reject/archive — a human override sitting on
  top of the AI mediation flow.
- **Transactions** — every escrow intent, its status, and commission taken.
- **Users** — the (pseudonymous) user list.
- **Settings** — set/replace/clear the AI API key, change the model
  string, and change the commission rate, all live with no restart needed.

## SEO

Public content is real, indexable HTML, not a client-rendered teaser — the
public/locked content split (see `src/lib/content`) means search engines
can actually crawl 60–90% of most listings, which is the main SEO asset
this product has.

- **Per-listing metadata** (`generateMetadata` in `src/app/listings/[id]/page.tsx`):
  title, description, canonical URL, and Open Graph tags built from the
  *public* content only — `buildPublicExcerpt()` in `src/lib/seo.ts` never
  touches locked segments. Verified directly against the raw served HTML,
  not just the DOM, that locked text is never present for a non-owner.
- **Non-approved listings are `noindex, nofollow`** — only `approved`
  listings are indexable; `pending_review`/`needs_info`/`rejected` are
  still reachable by URL (e.g. for the seller) but never advertised to
  crawlers.
- **JSON-LD `Product`/`Offer` structured data** on each listing page (price,
  currency, availability) — note `priceCurrency` is set to the stablecoin
  ticker (e.g. `USDC`), which isn't a real ISO 4217 code; schema.org has no
  official crypto-ticker support, this is the common workaround.
- **`robots.txt`** (`src/app/robots.ts`) allows everything except
  `/admin`, `/api`, `/dashboard`, `/listings/new`, `/sign-in`.
- **`sitemap.xml`** (`src/app/sitemap.ts`) lists the homepage plus every
  approved listing — regenerated per-request since it reads the live store.
- **Home page** carries real explanatory copy (semantic `h1`/`h2`s, not
  just marketing fluff) describing the actual mechanics, both for visitors
  and as indexable content in its own right.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS, mobile-first responsive layout throughout

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Structure

```
src/
  app/                    Routes (App Router)
    page.tsx              Browse approved listings
    listings/[id]/        Listing detail — public/locked content view, buy, respond to AI questions
    listings/new/         Seller submission form -> AI moderation
    dashboard/            Seller's own listings + status + content stats
    sign-in/              Wallet-connect placeholder (no email/password)
    admin/login/          Admin password gate
    admin/(protected)/    Overview, listings (+ per-listing override), transactions, users, settings
    robots.ts             robots.txt — disallows /admin, /api, /dashboard, /listings/new, /sign-in
    sitemap.ts            sitemap.xml — every approved listing
    api/listings/         List + create (parses content, runs moderation)
    api/listings/[id]/    Fetch one listing
    api/listings/[id]/respond/  Answer AI clarification questions, triggers re-review
    api/checkout/         Creates a real escrow payment intent (unique on-chain amount to send)
    api/transactions/[id]/confirm/  Real on-chain deposit check + automatic seller payout
    api/admin/            Login/logout, listing status override, settings — all session-gated

  components/
    layout/                 Navbar (responsive, mobile hamburger menu), Footer
    listings/                ListingCard, ListingGrid, ListingForm, BuyButton, ClarificationForm, RenewButton, ShareBox
    admin/                   LogoutButton, OverrideControls
    ui/                      Button, StatusBadge, ContentStatsBadge

  lib/
    auth/                   getCurrentUser() — replace with wallet-signature auth
    admin/auth.ts            Admin session store + password check
    chain/                   Real Base/USDC interaction — treasury wallet, deposit detection, payout signing
    content/                 parseContent/render*/stats + the persisted content store
    db/                     Repository interfaces + in-memory implementations
    listings/expiry.ts       Auto-expiry constants + helpers
    moderation/              ModerationService — mandatory checks + AI-mediated Q&A, real Claude call or heuristic
    payments/                PaymentService — real escrow intents against the treasury wallet
    settings/                Runtime-editable AI key/model/commission, set from /admin/settings
    format.ts                Stablecoin amount formatting helper

  types/                    Listing, User, Transaction, Moderation, Content
```

## Where the real work plugs in

Each of these is a small interface with one stub implementation. Swap the
implementation, keep the interface, and nothing else in the app changes:

| Concern    | File                          | Replace with |
|------------|-------------------------------|--------------|
| Database   | `src/lib/db/index.ts`         | Postgres/Supabase/etc, same repository shape |
| Content storage | `src/lib/content/index.ts` | An encrypted, access-controlled store — this is now the sensitive deliverable, not a throwaway review artifact |
| Auth       | `src/lib/auth/index.ts`       | Wallet-signature auth (e.g. Sign-In with Ethereum) — no email/password |
| Payments   | `src/lib/payments/index.ts`, `src/lib/chain/index.ts` | Already real (Base mainnet, real USDC) — the "real work" left is a smart-contract escrow instead of a single custodial wallet, and a webhook/indexer instead of polling `queryFilter` on click |
| AI moderation | `src/lib/moderation/index.ts` | Already calls a real Claude model when an API key is set via `/admin/settings` — the "real work" left is prompt tuning, not the integration itself |
| Admin auth | `src/lib/admin/auth.ts`, `src/app/api/admin/login` | Real credential storage (hashed password, or a real user/role system), rate limiting, persisted sessions |

### A quirk of the in-memory store

`src/lib/db/index.ts` and `src/lib/content/index.ts` keep their data on
`globalThis` rather than a plain module-level variable. This isn't
stylistic — Next.js compiles each route (API handlers, server-rendered
pages) into its own server bundle, so a normal module-scope variable is
**not** reliably shared across routes; `globalThis` is the one thing every
bundle running in the same Node process actually shares. Any page that
reads this store must also be forced dynamic (`export const dynamic =
"force-dynamic"`, already set on `/`, `/dashboard`, `/listings/new`,
`/listings/[id]`) — otherwise Next.js prerenders it once at build time and
it never reflects runtime changes. None of this matters once `src/lib/db`
and `src/lib/content` are backed by a real, out-of-process database.

## Listing lifecycle

`draft → pending_review → needs_info ⇄ (answer questions) → approved |
rejected`. The moderation verdict, outstanding questions, quality score,
and AI summary are stored on the listing (`listing.moderation`) so the
seller sees exactly why something needs more info, was rejected, or scored
the way it did.

## Not yet decided

- Real database/hosting choice — this is the big one now that real money is
  involved; the in-memory store's "resets on restart" caveat is a genuine
  operational risk on a live payment system, not just a dev inconvenience
- Smart-contract escrow instead of the current single custodial wallet
- A real webhook/indexer for deposits instead of a client-triggered log scan
- Additional chains/stablecoins beyond Base + USDC
- Wallet-signature auth provider
- Real admin authentication (today: one shared password, no rate limiting)
- Post-sale dispute mediation — what happens when a buyer says the
  delivered content didn't match what was promised (today, delivery is
  unconditional on payment confirmation)
- Request-for-information board, refund window details
