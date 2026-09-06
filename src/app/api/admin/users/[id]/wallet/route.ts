import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin/auth";
import { isValidAddress } from "@/lib/chain";
import { db } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { walletAddress } = (await request.json()) as { walletAddress: string };
  if (!walletAddress || !isValidAddress(walletAddress)) {
    return NextResponse.json({ error: "Not a valid wallet address" }, { status: 400 });
  }

  const user = await db.users.updateWalletAddress(params.id, walletAddress);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}
