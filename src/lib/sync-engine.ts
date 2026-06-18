import { prisma } from "./db";
import { getSetting, setSetting, SETTING_KEYS } from "./settings";
import { fetchAniListUser } from "./anilist";
import {
  lookupSonarrSeries,
  searchSonarrByTitle,
  addSonarrSeries,
  getSonarrExistingSeries,
  getSonarrProfiles,
  getSonarrRootFolders,
} from "./sonarr";
import {
  searchRadarrByTitle,
  addRadarrMovie,
  getRadarrExistingMovies,
  getRadarrProfiles,
  getRadarrRootFolders,
} from "./radarr";
import { getJellyfinMatchedIds } from "./jellyfin";
import type { AniListEntry, SyncResult } from "@/types";

async function log(action: string, title: string | null, status: string, details?: string) {
  await prisma.syncLog.create({
    data: { action, title, status, details },
  });
}

export async function importFromAniList(): Promise<{ imported: number; total: number }> {
  const username = await getSetting(SETTING_KEYS.ANILIST_USERNAME);
  if (!username) {
    throw new Error("AniList username not configured");
  }

  const minRating = parseFloat((await getSetting(SETTING_KEYS.MIN_RATING)) || "0");
  const syncStatusesRaw = await getSetting(SETTING_KEYS.SYNC_STATUSES);
  const syncFormatsRaw = await getSetting(SETTING_KEYS.SYNC_FORMATS);

  const syncStatuses = syncStatusesRaw ? JSON.parse(syncStatusesRaw) : ["CURRENT", "COMPLETED", "PLANNING", "PAUSED", "DROPPED"];
  const syncFormats = syncFormatsRaw ? JSON.parse(syncFormatsRaw) : ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"];

  const lists = await fetchAniListUser(username);

  await log("ANILIST_FETCH", null, "SUCCESS", `Fetched ${lists.length} lists from ${username}`);

  let imported = 0;
  let total = 0;

  for (const list of lists) {
    for (const entry of list.entries) {
      total++;

      if (syncStatuses.length > 0 && !syncStatuses.includes(entry.status)) continue;
      if (entry.media.format && syncFormats.length > 0 && !syncFormats.includes(entry.media.format)) continue;

      const score = entry.score || (entry.media.averageScore ? entry.media.averageScore / 10 : 0);
      if (minRating > 0 && score < minRating) continue;

      const { media } = entry;

      await prisma.syncedTitle.upsert({
        where: { anilistId: media.id },
        update: {
          title: media.title.romaji,
          titleEnglish: media.title.english,
          coverImage: media.coverImage.large,
          anilistStatus: entry.status,
          userScore: entry.score || null,
          averageScore: media.averageScore ? media.averageScore / 10 : null,
          format: media.format,
        },
        create: {
          anilistId: media.id,
          title: media.title.romaji,
          titleEnglish: media.title.english,
          coverImage: media.coverImage.large,
          mediaType: media.type,
          format: media.format,
          anilistStatus: entry.status,
          userScore: entry.score || null,
          averageScore: media.averageScore ? media.averageScore / 10 : null,
          syncStatus: "PENDING",
        },
      });

      imported++;
    }
  }

  await log("ANILIST_FETCH", null, "SUCCESS", `Imported ${imported}/${total} titles from AniList`);
  return { imported, total };
}

export async function runSync(): Promise<SyncResult> {
  const result: SyncResult = { total: 0, added: 0, skipped: 0, failed: 0, errors: [] };

  const username = await getSetting(SETTING_KEYS.ANILIST_USERNAME);
  if (!username) {
    await log("SYNC_RUN", null, "FAILED", "AniList username not configured");
    throw new Error("AniList username not configured");
  }

  const sonarrUrl = await getSetting(SETTING_KEYS.SONARR_URL);
  const sonarrKey = await getSetting(SETTING_KEYS.SONARR_API_KEY);
  const radarrUrl = await getSetting(SETTING_KEYS.RADARR_URL);
  const radarrKey = await getSetting(SETTING_KEYS.RADARR_API_KEY);
  let sonarrRoot = await getSetting(SETTING_KEYS.SONARR_ROOT_FOLDER);
  let radarrRoot = await getSetting(SETTING_KEYS.RADARR_ROOT_FOLDER);
  let sonarrProfileId = await getSetting(SETTING_KEYS.SONARR_QUALITY_PROFILE);
  let radarrProfileId = await getSetting(SETTING_KEYS.RADARR_QUALITY_PROFILE);
  const sonarrProfileHighId = await getSetting(SETTING_KEYS.SONARR_QUALITY_PROFILE_HIGH);
  const radarrProfileHighId = await getSetting(SETTING_KEYS.RADARR_QUALITY_PROFILE_HIGH);
  const qualityThreshold = parseFloat((await getSetting(SETTING_KEYS.QUALITY_SCORE_THRESHOLD)) || "0");

  const jellyfinUrl = await getSetting(SETTING_KEYS.JELLYFIN_URL);
  const jellyfinKey = await getSetting(SETTING_KEYS.JELLYFIN_API_KEY);
  const hasJellyfin = !!(jellyfinUrl && jellyfinKey);

  if (sonarrUrl && sonarrKey) {
    if (!sonarrRoot) {
      try {
        const rootFolders = await getSonarrRootFolders(sonarrUrl, sonarrKey);
        if (rootFolders.length > 0) {
          sonarrRoot = rootFolders[0].path;
          await setSetting(SETTING_KEYS.SONARR_ROOT_FOLDER, sonarrRoot);
        }
      } catch { /* ignore */ }
    }
    if (!sonarrProfileId) {
      try {
        const profiles = await getSonarrProfiles(sonarrUrl, sonarrKey);
        if (profiles.length > 0) {
          sonarrProfileId = String(profiles[0].id);
          await setSetting(SETTING_KEYS.SONARR_QUALITY_PROFILE, sonarrProfileId);
        }
      } catch { /* ignore */ }
    }
  }

  if (radarrUrl && radarrKey) {
    if (!radarrRoot) {
      try {
        const rootFolders = await getRadarrRootFolders(radarrUrl, radarrKey);
        if (rootFolders.length > 0) {
          radarrRoot = rootFolders[0].path;
          await setSetting(SETTING_KEYS.RADARR_ROOT_FOLDER, radarrRoot);
        }
      } catch { /* ignore */ }
    }
    if (!radarrProfileId) {
      try {
        const profiles = await getRadarrProfiles(radarrUrl, radarrKey);
        if (profiles.length > 0) {
          radarrProfileId = String(profiles[0].id);
          await setSetting(SETTING_KEYS.RADARR_QUALITY_PROFILE, radarrProfileId);
        }
      } catch { /* ignore */ }
    }
  }

  const hasSonarr = !!(sonarrUrl && sonarrKey && sonarrRoot && sonarrProfileId);
  const hasRadarr = !!(radarrUrl && radarrKey && radarrRoot && radarrProfileId);

  await log("SYNC_RUN", null, "SUCCESS",
    `Sync started (Sonarr: ${hasSonarr ? "connected" : "not configured"}, Radarr: ${hasRadarr ? "connected" : "not configured"})`);

  // Step 1: Import from AniList
  const { imported } = await importFromAniList();
  result.total = imported;

  // Step 2: If no *arr services, we're done — titles are imported and visible
  if (!hasSonarr && !hasRadarr) {
    await setSetting(SETTING_KEYS.LAST_SYNC_AT, new Date().toISOString());
    await log("SYNC_RUN", null, "SUCCESS", `Imported ${imported} titles (no *arr services configured)`);
    return result;
  }

  // Step 3: Push pending titles to Sonarr/Radarr
  let existingSonarrSeries: { tvdbId: number }[] = [];
  let existingRadarrMovies: { tmdbId: number }[] = [];

  if (hasSonarr) {
    try {
      existingSonarrSeries = await getSonarrExistingSeries(sonarrUrl!, sonarrKey!);
    } catch { /* ignore */ }
  }
  if (hasRadarr) {
    try {
      existingRadarrMovies = await getRadarrExistingMovies(radarrUrl!, radarrKey!);
    } catch { /* ignore */ }
  }

  let jellyfinData: Awaited<ReturnType<typeof getJellyfinMatchedIds>> | null = null;
  if (hasJellyfin) {
    try {
      jellyfinData = await getJellyfinMatchedIds(jellyfinUrl!, jellyfinKey!);
      await log("JELLYFIN_CHECK", null, "SUCCESS", `Found ${jellyfinData.titles.size} items in Jellyfin`);
    } catch {
      await log("JELLYFIN_CHECK", null, "FAILED", "Could not connect to Jellyfin");
    }
  }

  const pendingTitles = await prisma.syncedTitle.findMany({
    where: { syncStatus: { in: ["PENDING", "FAILED"] } },
  });

  for (const syncedTitle of pendingTitles) {
    const title = syncedTitle.titleEnglish || syncedTitle.title;
    const isMovie = syncedTitle.format === "MOVIE";
    const titleScore = syncedTitle.userScore || syncedTitle.averageScore || 0;
    const isHighScore = qualityThreshold > 0 && titleScore >= qualityThreshold;

    if (jellyfinData) {
      const inJellyfin =
        jellyfinData.anilistIds.has(String(syncedTitle.anilistId)) ||
        (syncedTitle.tvdbId ? jellyfinData.tvdbIds.has(String(syncedTitle.tvdbId)) : false) ||
        (syncedTitle.tmdbId ? jellyfinData.tmdbIds.has(String(syncedTitle.tmdbId)) : false) ||
        jellyfinData.titles.has(title.toLowerCase().trim());

      if (inJellyfin) {
        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: { syncStatus: "SYNCED", inJellyfin: true, syncedAt: new Date() },
        });
        await log("JELLYFIN_SKIP", title, "SKIPPED", "Already in Jellyfin");
        result.skipped++;
        continue;
      }
    }

    if (isMovie && hasRadarr) {
      try {
        const movieData = await searchRadarrByTitle(radarrUrl!, radarrKey!, title);

        if (!movieData) {
          await prisma.syncedTitle.update({
            where: { id: syncedTitle.id },
            data: { syncStatus: "FAILED", failReason: "Not found in Radarr lookup" },
          });
          await log("RADARR_ADD", title, "FAILED", "Not found in Radarr lookup");
          result.failed++;
          continue;
        }

        const alreadyInRadarr = existingRadarrMovies.some(
          (m) => m.tmdbId === movieData.tmdbId
        );

        if (alreadyInRadarr) {
          await prisma.syncedTitle.update({
            where: { id: syncedTitle.id },
            data: { syncStatus: "SYNCED", tmdbId: movieData.tmdbId, syncedAt: new Date() },
          });
          await log("RADARR_ADD", title, "SKIPPED", "Already in Radarr");
          result.skipped++;
          continue;
        }

        const radarrProfile = (isHighScore && radarrProfileHighId) ? radarrProfileHighId : radarrProfileId!;
        const added = await addRadarrMovie(radarrUrl!, radarrKey!, {
          title: movieData.title,
          tmdbId: movieData.tmdbId,
          qualityProfileId: parseInt(radarrProfile),
          rootFolderPath: radarrRoot!,
          titleSlug: movieData.titleSlug,
          images: movieData.images,
          year: movieData.year,
        });

        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: { syncStatus: "SYNCED", radarrId: added.id, tmdbId: movieData.tmdbId, syncedAt: new Date() },
        });
        await log("RADARR_ADD", title, "SUCCESS", `Added with TMDB ID ${movieData.tmdbId}`);
        result.added++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: { syncStatus: "FAILED", failReason: msg },
        });
        await log("RADARR_ADD", title, "FAILED", msg);
        result.failed++;
        result.errors.push(`${title}: ${msg}`);
      }
    } else if (!isMovie && hasSonarr) {
      try {
        let seriesData = await searchSonarrByTitle(sonarrUrl!, sonarrKey!, title);

        if (!seriesData && syncedTitle.tvdbId) {
          seriesData = await lookupSonarrSeries(sonarrUrl!, sonarrKey!, syncedTitle.tvdbId);
        }

        if (!seriesData) {
          await prisma.syncedTitle.update({
            where: { id: syncedTitle.id },
            data: { syncStatus: "FAILED", failReason: "Not found in Sonarr lookup" },
          });
          await log("SONARR_ADD", title, "FAILED", "Not found in Sonarr lookup");
          result.failed++;
          continue;
        }

        const alreadyInSonarr = existingSonarrSeries.some(
          (s) => s.tvdbId === seriesData.tvdbId
        );

        if (alreadyInSonarr) {
          await prisma.syncedTitle.update({
            where: { id: syncedTitle.id },
            data: { syncStatus: "SYNCED", tvdbId: seriesData.tvdbId, syncedAt: new Date() },
          });
          await log("SONARR_ADD", title, "SKIPPED", "Already in Sonarr");
          result.skipped++;
          continue;
        }

        const sonarrProfile = (isHighScore && sonarrProfileHighId) ? sonarrProfileHighId : sonarrProfileId!;
        const added = await addSonarrSeries(sonarrUrl!, sonarrKey!, {
          title: seriesData.title,
          tvdbId: seriesData.tvdbId,
          qualityProfileId: parseInt(sonarrProfile),
          rootFolderPath: sonarrRoot!,
          titleSlug: seriesData.titleSlug,
          images: seriesData.images,
          seasons: seriesData.seasons,
        });

        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: { syncStatus: "SYNCED", sonarrId: added.id, tvdbId: seriesData.tvdbId, syncedAt: new Date() },
        });
        await log("SONARR_ADD", title, "SUCCESS", `Added with TVDB ID ${seriesData.tvdbId}`);
        result.added++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: { syncStatus: "FAILED", failReason: msg },
        });
        await log("SONARR_ADD", title, "FAILED", msg);
        result.failed++;
        result.errors.push(`${title}: ${msg}`);
      }
    }
  }

  await setSetting(SETTING_KEYS.LAST_SYNC_AT, new Date().toISOString());
  await log("SYNC_RUN", null, "SUCCESS", `Completed: ${result.added} added, ${result.skipped} skipped, ${result.failed} failed`);

  return result;
}
