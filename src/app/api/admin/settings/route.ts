import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin/auth";
import { getSettings, maskApiKey, updateSettings } from "@/lib/settings";

function requireAdmin(): boolean {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSession(token);
}

export async function GET() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    aiApiKeySet: !!settings.aiApiKey,
    aiApiKeyMasked: maskApiKey(settings.aiApiKey),
    aiModel: settings.aiModel,
    commissionBps: settings.commissionBps,
  });
}

export async function POST(request: NextRequest) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    aiApiKey?: string | null;
    aiModel?: string;
    commissionBps?: number;
  };

  const patch: Partial<{ aiApiKey: string | null; aiModel: string; commissionBps: number }> = {};

  if (typeof body.aiApiKey === "string") {
    patch.aiApiKey = body.aiApiKey.trim() || null;
  } else if (body.aiApiKey === null) {
    patch.aiApiKey = null;
  }
  if (typeof body.aiModel === "string" && body.aiModel.trim()) {
    patch.aiModel = body.aiModel.trim();
  }
  if (typeof body.commissionBps === "number" && body.commissionBps >= 0 && body.commissionBps <= 10000) {
    patch.commissionBps = Math.round(body.commissionBps);
  }

  const updated = await updateSettings(patch);
  return NextResponse.json({
    aiApiKeySet: !!updated.aiApiKey,
    aiApiKeyMasked: maskApiKey(updated.aiApiKey),
    aiModel: updated.aiModel,
    commissionBps: updated.commissionBps,
  });
}
