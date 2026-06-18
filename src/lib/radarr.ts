import type { QualityProfile, RootFolder } from "@/types";

async function radarrFetch(baseUrl: string, apiKey: string, path: string, options?: RequestInit) {
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
    throw new Error(`Radarr ${res.status}: ${text}`);
  }
  return res.json();
}

export async function testRadarrConnection(baseUrl: string, apiKey: string): Promise<boolean> {
  const data = await radarrFetch(baseUrl, apiKey, "/system/status");
  return !!data.version;
}

export async function getRadarrProfiles(baseUrl: string, apiKey: string): Promise<QualityProfile[]> {
  return radarrFetch(baseUrl, apiKey, "/qualityprofile");
}

export async function getRadarrRootFolders(baseUrl: string, apiKey: string): Promise<RootFolder[]> {
  return radarrFetch(baseUrl, apiKey, "/rootfolder");
}

export async function lookupRadarrMovie(baseUrl: string, apiKey: string, tmdbId: number) {
  const result = await radarrFetch(baseUrl, apiKey, `/movie/lookup/tmdb?tmdbId=${tmdbId}`);
  return result || null;
}

export async function searchRadarrByTitle(baseUrl: string, apiKey: string, title: string) {
  try {
    const results = await radarrFetch(baseUrl, apiKey, `/movie/lookup?term=${encodeURIComponent(title)}`);
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

export async function addRadarrMovie(
  baseUrl: string,
  apiKey: string,
  movie: {
    title: string;
    tmdbId: number;
    qualityProfileId: number;
    rootFolderPath: string;
    titleSlug?: string;
    images?: unknown[];
    year?: number;
  }
) {
  try {
    return await radarrFetch(baseUrl, apiKey, "/movie", {
      method: "POST",
      body: JSON.stringify({
        ...movie,
        monitored: true,
        addOptions: {
          searchForMovie: true,
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

export async function getRadarrExistingMovies(baseUrl: string, apiKey: string) {
  return radarrFetch(baseUrl, apiKey, "/movie");
}
