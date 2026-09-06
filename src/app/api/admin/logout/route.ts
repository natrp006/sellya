import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, destroyAdminSession } from "@/lib/admin/auth";

export async function POST() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  destroyAdminSession(token);
  cookies().delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
