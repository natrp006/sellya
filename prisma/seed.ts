import { PrismaClient } from "@prisma/client";
import { computeContentStats, parseContent } from "../src/lib/content";

const prisma = new PrismaClient();

const now = () => new Date();

async function seedListing(
  id: string,
  sellerId: string,
  title: string,
  summary: string,
  tags: string[],
  priceCents: number,
  rawContent: string,
  qualityScore: number
) {
  const segments = parseContent(rawContent);
  const contentStats = computeContentStats(segments);

  await prisma.listing.upsert({
    where: { id },
    update: {},
    create: {
      id,
      sellerId,
      title,
      summary,
      tags,
      priceCents,
      currency: "usdc",
      status: "approved",
      moderation: {
        verdict: "approved",
        reasons: [],
        questions: [],
        qualityScore,
        summary: "Reviewed the seller's full submitted content for structure, specificity, and depth.",
        confidence: 0.9,
        reviewedAt: now().toISOString(),
      },
      contentStats: contentStats as unknown as object,
      clarifications: [],
      segments: {
        create: segments.map((s, i) => ({ position: i, type: s.type, text: s.text })),
      },
    },
  });
}

async function main() {
  const sellers = [
    { id: "user_seed_1", handle: "anon_seed1" },
    { id: "user_seed_2", handle: "anon_seed2" },
    { id: "user_seed_3", handle: "anon_seed3" },
  ];

  for (const seller of sellers) {
    await prisma.user.upsert({
      where: { id: seller.id },
      update: {},
      create: { id: seller.id, handle: seller.handle, walletAddress: null, role: "seller" },
    });
  }

  await seedListing(
    "listing_1",
    "user_seed_1",
    "The Facebook Ad Setup I Use for Sub-$15 Plumbing Leads",
    "Campaign structure, targeting, and ad copy that consistently produces cheap, qualified leads for local home-service businesses.",
    ["marketing", "facebook-ads", "local-business"],
    2500,
    "This is the exact Facebook ad campaign structure I've used to keep cost-per-lead under $15 for local plumbing and HVAC businesses. The setup uses a two-stage funnel: a broad awareness campaign targeting homeowners in a 15-mile radius aged 30-65, followed by a retargeting campaign to anyone who watched at least 50% of the first video. Both campaigns run on a daily budget split roughly 70/30 between awareness and retargeting, adjusted weekly based on cost-per-lead. The creative angle that consistently outperforms generic \"call us today\" ads is a before/after problem-solving format shot on a phone, not professionally produced. {{Exact budget split, bid strategy, and the specific ad copy/headlines that produced our best-performing campaigns, word for word.}}",
    8
  );

  await seedListing(
    "listing_2",
    "user_seed_2",
    "My Quote Calculator for Residential Solar Installs",
    "Enter system size, labor, and materials — get a customer-facing quote with margin already built in.",
    ["solar", "pricing", "calculator"],
    1500,
    "This is the pricing logic I use to quote residential solar installs without underbidding myself. The general approach: take the system size in kilowatts, multiply by a base cost-per-watt that accounts for panel type and labor complexity, add a fixed permitting/inspection fee, then apply a margin that scales down slightly as system size increases (larger jobs can carry a thinner percentage margin and still be profitable). The calculator also flags jobs where roof complexity or panel count pushes labor hours past a threshold, so you know to quote higher before you're locked in. {{The exact cost-per-watt figures, fixed fee amounts, and margin percentages by system size tier that the calculator uses.}}",
    7
  );

  await seedListing(
    "listing_3",
    "user_seed_3",
    "The Wholesale Coffee Bean Supplier I Use — No Distributor Markup",
    "Direct import contact, minimum order quantities, and per-kilogram pricing for restaurant-grade beans.",
    ["sourcing", "coffee", "wholesale"],
    2000,
    "How I source restaurant-grade coffee beans directly from an importer instead of going through a distributor, cutting my per-kilogram cost significantly. The process: importers who deal in green (unroasted) coffee sell in bulk lots, and most have a minimum order quantity that's much lower than people assume — small cafes and roasters can qualify without needing warehouse-scale volume. I vetted suppliers by requesting sample lots first, checking their sourcing certifications, and confirming shipping/customs handling before committing to a full order. {{The specific importer's name, contact details, minimum order quantity, and current per-kilogram pricing.}}",
    8
  );

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
