import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGE_LENGTH = 5000;
const MAX_CONTACT_INFO_LENGTH = 200;

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "contact", 5, 15 * 60 * 1000);
  if (limited) return limited;

  const { message, contactInfo } = (await request.json()) as { message?: string; contactInfo?: string };

  const trimmedMessage = (message ?? "").trim();
  if (!trimmedMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
  }

  const trimmedContactInfo = contactInfo?.trim() || null;
  if (trimmedContactInfo && trimmedContactInfo.length > MAX_CONTACT_INFO_LENGTH) {
    return NextResponse.json({ error: "Contact info is too long" }, { status: 400 });
  }

  const sessionId = cookies().get(SESSION_COOKIE)?.value ?? null;

  await db.contactMessages.create({ message: trimmedMessage, contactInfo: trimmedContactInfo, sessionId });

  return NextResponse.json({ ok: true });
}
