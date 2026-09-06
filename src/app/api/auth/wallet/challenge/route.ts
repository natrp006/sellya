import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWalletChallenge } from "@/lib/auth/wallet";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "wallet-challenge", 20, 5 * 60 * 1000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { message } = await createWalletChallenge(user.id);
  return NextResponse.json({ message });
}
