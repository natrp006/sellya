import { prisma } from "@/lib/prisma";

export interface PlatformSettings {
  aiApiKey: string | null;
  aiModel: string;
  commissionBps: number;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_COMMISSION_BPS = 2000; // 20%
const SETTINGS_ROW_ID = "global";

/**
 * Runtime-editable platform config (AI key, model, commission rate), set
 * from /admin/settings. Persisted in Postgres (PlatformSettings model) —
 * previously in-memory, which meant the AI key vanished on every restart.
 */
export async function getSettings(): Promise<PlatformSettings> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ROW_ID } });
  if (existing) {
    return { aiApiKey: existing.aiApiKey, aiModel: existing.aiModel, commissionBps: existing.commissionBps };
  }
  const created = await prisma.platformSettings.create({
    data: {
      id: SETTINGS_ROW_ID,
      aiApiKey: process.env.MODERATION_API_KEY || null,
      aiModel: DEFAULT_MODEL,
      commissionBps: DEFAULT_COMMISSION_BPS,
    },
  });
  return { aiApiKey: created.aiApiKey, aiModel: created.aiModel, commissionBps: created.commissionBps };
}

export async function updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  await getSettings(); // ensure the row exists before a partial update
  const updated = await prisma.platformSettings.update({
    where: { id: SETTINGS_ROW_ID },
    data: patch,
  });
  return { aiApiKey: updated.aiApiKey, aiModel: updated.aiModel, commissionBps: updated.commissionBps };
}

export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(8)}${key.slice(-4)}`;
}
