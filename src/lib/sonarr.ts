import type { QualityProfile, RootFolder } from "@/types";

async function sonarrFetch(baseUrl: string, apiKey: string, path: string, options?: RequestInit) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v3${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sonarr ${res.status}: ${text}`);
  }
  return res.json();
}

export async function testSonarrConnection(baseUrl: string, apiKey: string): Promise<boolean> {
  const data = await sonarrFetch(baseUrl, apiKey, "/system/status");
  return !!data.version;
}

export async function getSonarrProfiles(baseUrl: string, apiKey: string): Promise<QualityProfile[]> {
  return sonarrFetch(baseUrl, apiKey, "/qualityprofile");
}

export async function getSonarrRootFolders(baseUrl: string, apiKey: string): Promise<RootFolder[]> {
  return sonarrFetch(baseUrl, apiKey, "/rootfolder");
}

export async function lookupSonarrSeries(baseUrl: string, apiKey: string, tvdbId: number) {
  try {
    const results = await sonarrFetch(baseUrl, apiKey, `/series/lookup?term=tvdb:${tvdbId}`);
    if (!Array.isArray(results)) return null;
    return results[0] || null;
  } catch {
    return null;
  }
}

export async function searchSonarrByTitle(baseUrl: string, apiKey: string, title: string) {
  try {
    const results = await sonarrFetch(baseUrl, apiKey, `/series/lookup?term=${encodeURIComponent(title)}`);
    if (!Array.isArray(results) || results.length === 0) return null;
    const lower = title.toLowerCase();
    const exact = results.find(
      (r: { title?: string; alternateTitles?: { title: string }[] }) =>
        r.title?.toLowerCase() === lower ||
        r.alternateTitles?.some((a) => a.title.toLowerCase() === lower)
    );
    return exact || results[0];
  } catch {
    return null;
  }
}

export async function addSonarrSeries(
  baseUrl: string,
  apiKey: string,
  series: {
    title: string;
    tvdbId: number;
    qualityProfileId: number;
    rootFolderPath: string;
    titleSlug?: string;
    images?: unknown[];
    seasons?: unknown[];
  }
) {
  try {
    return await sonarrFetch(baseUrl, apiKey, "/series", {
      method: "POST",
      body: JSON.stringify({
        ...series,
        monitored: true,
        addOptions: {
          searchForMissingEpisodes: true,
        },
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("already been added") || msg.includes("already exists")) {
      return { id: 0, alreadyExists: true };
    }
    throw err;
  }
}

export async function getSonarrExistingSeries(baseUrl: string, apiKey: string) {
  return sonarrFetch(baseUrl, apiKey, "/series");
}
