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
  const results = await sonarrFetch(baseUrl, apiKey, `/series/lookup?term=tvdb:${tvdbId}`);
  return results[0] || null;
}

export async function searchSonarrByTitle(baseUrl: string, apiKey: string, title: string) {
  const results = await sonarrFetch(baseUrl, apiKey, `/series/lookup?term=${encodeURIComponent(title)}`);
  return results[0] || null;
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
  return sonarrFetch(baseUrl, apiKey, "/series", {
    method: "POST",
    body: JSON.stringify({
      ...series,
      monitored: true,
      addOptions: {
        searchForMissingEpisodes: true,
      },
    }),
  });
}

export async function getSonarrExistingSeries(baseUrl: string, apiKey: string) {
  return sonarrFetch(baseUrl, apiKey, "/series");
}
