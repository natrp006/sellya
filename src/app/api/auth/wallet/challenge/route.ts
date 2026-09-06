import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWalletChallenge } from "@/lib/auth/wallet";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { message } = await createWalletChallenge(user.id);
  return NextResponse.json({ message });
}
