import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, checkAdminPassword, createAdminSession } from "@/lib/admin/auth";
import { checkRateLimit } from "@/lib/rateLimit";

// A single shared password with no lockout would otherwise be brute-forceable.
const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "admin-login", LOGIN_ATTEMPT_LIMIT, LOGIN_WINDOW_MS);
  if (limited) return limited;

  const { password } = (await request.json()) as { password: string };

  if (!checkAdminPassword(password ?? "")) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = createAdminSession();
  cookies().set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
