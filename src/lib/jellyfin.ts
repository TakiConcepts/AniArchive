interface JellyfinItem {
  Name: string;
  Id: string;
  Type: string;
  ProviderIds?: Record<string, string | undefined>;
}

interface JellyfinSearchResult {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

function jellyfinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function testJellyfinConnection(url: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(jellyfinUrl(url, "/System/Info"), {
      headers: { "X-Emby-Token": apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getJellyfinLibraryItems(url: string, apiKey: string): Promise<JellyfinItem[]> {
  const res = await fetch(
    jellyfinUrl(url, "/Items?Recursive=true&IncludeItemTypes=Series,Movie&Fields=ProviderIds&Limit=10000"),
    { headers: { "X-Emby-Token": apiKey } }
  );
  if (!res.ok) throw new Error(`Jellyfin API error: ${res.status}`);
  const data: JellyfinSearchResult = await res.json();
  return data.Items || [];
}

export async function getJellyfinMatchedIds(url: string, apiKey: string): Promise<{
  anilistIds: Set<string>;
  tvdbIds: Set<string>;
  tmdbIds: Set<string>;
  titles: Set<string>;
}> {
  const items = await getJellyfinLibraryItems(url, apiKey);
  const anilistIds = new Set<string>();
  const tvdbIds = new Set<string>();
  const tmdbIds = new Set<string>();
  const titles = new Set<string>();

  for (const item of items) {
    if (item.ProviderIds?.AniList) anilistIds.add(item.ProviderIds.AniList);
    if (item.ProviderIds?.Tvdb) tvdbIds.add(item.ProviderIds.Tvdb);
    if (item.ProviderIds?.Tmdb) tmdbIds.add(item.ProviderIds.Tmdb);
    titles.add(item.Name.toLowerCase().trim());
  }

  return { anilistIds, tvdbIds, tmdbIds, titles };
}
