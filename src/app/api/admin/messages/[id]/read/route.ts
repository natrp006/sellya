import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin/auth";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const message = await db.contactMessages.markRead(params.id);
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  return NextResponse.json({ message });
}
