import { prisma } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });
  const map: Record<string, string | null> = {};
  for (const k of keys) {
    map[k] = settings.find((s) => s.key === k)?.value ?? null;
  }
  return map;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  return map;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function setSettings(entries: Record<string, string>): Promise<void> {
  const ops = Object.entries(entries).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await prisma.$transaction(ops);
}

export const SETTING_KEYS = {
  SONARR_URL: "sonarr_url",
  SONARR_API_KEY: "sonarr_api_key",
  SONARR_ROOT_FOLDER: "sonarr_root_folder",
  SONARR_QUALITY_PROFILE: "sonarr_quality_profile_id",
  RADARR_URL: "radarr_url",
  RADARR_API_KEY: "radarr_api_key",
  RADARR_ROOT_FOLDER: "radarr_root_folder",
  RADARR_QUALITY_PROFILE: "radarr_quality_profile_id",
  JELLYFIN_URL: "jellyfin_url",
  JELLYFIN_API_KEY: "jellyfin_api_key",
  ANILIST_USERNAME: "anilist_username",
  SYNC_ENABLED: "sync_enabled",
  SYNC_INTERVAL_MINUTES: "sync_interval_minutes",
  MIN_RATING: "min_rating_threshold",
  SYNC_STATUSES: "sync_statuses",
  SYNC_FORMATS: "sync_formats",
  QUALITY_DEFAULT: "quality_default",
  DEALS_ENABLED: "deals_enabled",
  DEALS_MAX_PRICE: "deals_max_price",
  DEALS_SOURCES: "deals_sources",
  LAST_SYNC_AT: "last_sync_at",
} as const;
