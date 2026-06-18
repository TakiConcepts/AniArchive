import { prisma } from "./db";
import { getSetting, setSetting, SETTING_KEYS } from "./settings";
import { fetchAniListUser } from "./anilist";
import {
  lookupSonarrSeries,
  searchSonarrByTitle,
  addSonarrSeries,
  getSonarrExistingSeries,
} from "./sonarr";
import {
  searchRadarrByTitle,
  addRadarrMovie,
  getRadarrExistingMovies,
} from "./radarr";
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
  const sonarrRoot = await getSetting(SETTING_KEYS.SONARR_ROOT_FOLDER);
  const radarrRoot = await getSetting(SETTING_KEYS.RADARR_ROOT_FOLDER);
  const sonarrProfileId = await getSetting(SETTING_KEYS.SONARR_QUALITY_PROFILE);
  const radarrProfileId = await getSetting(SETTING_KEYS.RADARR_QUALITY_PROFILE);

  const hasSonarr = !!(sonarrUrl && sonarrKey && sonarrRoot && sonarrProfileId);
  const hasRadarr = !!(radarrUrl && radarrKey && radarrRoot && radarrProfileId);

  await log("SYNC_RUN", null, "SUCCESS", "Sync started");

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

  const pendingTitles = await prisma.syncedTitle.findMany({
    where: { syncStatus: { in: ["PENDING", "FAILED"] } },
  });

  for (const syncedTitle of pendingTitles) {
    const title = syncedTitle.titleEnglish || syncedTitle.title;
    const isMovie = syncedTitle.format === "MOVIE";

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

        const added = await addRadarrMovie(radarrUrl!, radarrKey!, {
          title: movieData.title,
          tmdbId: movieData.tmdbId,
          qualityProfileId: parseInt(radarrProfileId!),
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

        const added = await addSonarrSeries(sonarrUrl!, sonarrKey!, {
          title: seriesData.title,
          tvdbId: seriesData.tvdbId,
          qualityProfileId: parseInt(sonarrProfileId!),
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
