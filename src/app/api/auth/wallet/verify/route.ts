import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isValidAddress } from "@/lib/chain";
import { verifyWalletSignature } from "@/lib/auth/wallet";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "wallet-verify", 20, 5 * 60 * 1000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { signature, address } = (await request.json()) as { signature?: string; address?: string };
  if (!signature || !address || !isValidAddress(address)) {
    return NextResponse.json({ error: "signature and a valid address are required" }, { status: 400 });
  }

  const result = await verifyWalletSignature(user.id, signature, address);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}
