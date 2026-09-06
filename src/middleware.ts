import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "sellya_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Two jobs on every request:
 * 1. Zero-setup traffic visibility — logs to the server console, which
 *    shows up in `railway logs`. Not a dashboard — no counts, no
 *    persistence — just a live signal that someone hit the site.
 * 2. Assigns each visitor a random anonymous session cookie if they don't
 *    have one yet. This is what makes different browsers distinct
 *    identities (src/lib/auth) instead of everyone sharing one — set here
 *    because Server Components can't set cookies themselves, only
 *    middleware and Route Handlers can.
 */
export function middleware(request: NextRequest) {
  const referer = request.headers.get("referer") ?? "-";
  console.log(`[visit] ${request.method} ${request.nextUrl.pathname} ref=${referer}`);

  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    const sessionId = crypto.randomUUID();
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
