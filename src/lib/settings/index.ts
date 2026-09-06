export interface PlatformSettings {
  aiApiKey: string | null;
  aiModel: string;
  commissionBps: number;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_COMMISSION_BPS = 2000; // 20%

/**
 * Runtime-editable platform config (AI key, model, commission rate) set
 * from the admin panel. Held on globalThis for the same cross-route-bundle
 * reason as src/lib/db — see the comment there. This is in-memory only: it
 * resets on server restart. A real implementation must persist this
 * (encrypted) in a real datastore, not process memory.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sellyaSettings: PlatformSettings | undefined;
}

function getStore(): PlatformSettings {
  if (!globalThis.__sellyaSettings) {
    globalThis.__sellyaSettings = {
      aiApiKey: process.env.MODERATION_API_KEY || null,
      aiModel: DEFAULT_MODEL,
      commissionBps: DEFAULT_COMMISSION_BPS,
    };
  }
  return globalThis.__sellyaSettings;
}

export function getSettings(): PlatformSettings {
  return getStore();
}

export function updateSettings(patch: Partial<PlatformSettings>): PlatformSettings {
  const store = getStore();
  Object.assign(store, patch);
  return store;
}

export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(8)}${key.slice(-4)}`;
}
