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
  lookupRadarrMovie,
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
  const minRating = parseFloat((await getSetting(SETTING_KEYS.MIN_RATING)) || "0");
  const syncStatusesRaw = await getSetting(SETTING_KEYS.SYNC_STATUSES);
  const syncFormatsRaw = await getSetting(SETTING_KEYS.SYNC_FORMATS);

  const syncStatuses = syncStatusesRaw ? JSON.parse(syncStatusesRaw) : ["CURRENT", "COMPLETED", "PLANNING"];
  const syncFormats = syncFormatsRaw ? JSON.parse(syncFormatsRaw) : ["TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "SPECIAL"];

  await log("SYNC_RUN", null, "SUCCESS", "Sync started");

  let lists;
  try {
    lists = await fetchAniListUser(username);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await log("ANILIST_FETCH", null, "FAILED", msg);
    throw err;
  }

  await log("ANILIST_FETCH", null, "SUCCESS", `Fetched ${lists.length} lists`);

  const allEntries: AniListEntry[] = [];
  for (const list of lists) {
    for (const entry of list.entries) {
      if (!syncStatuses.includes(entry.status)) continue;
      if (entry.media.format && !syncFormats.includes(entry.media.format)) continue;

      const score = entry.score || (entry.media.averageScore ? entry.media.averageScore / 10 : 0);
      if (minRating > 0 && score < minRating) continue;

      allEntries.push(entry);
    }
  }

  result.total = allEntries.length;

  let existingSonarrSeries: { tvdbId: number }[] = [];
  let existingRadarrMovies: { tmdbId: number }[] = [];

  if (sonarrUrl && sonarrKey) {
    try {
      existingSonarrSeries = await getSonarrExistingSeries(sonarrUrl, sonarrKey);
    } catch { /* ignore */ }
  }
  if (radarrUrl && radarrKey) {
    try {
      existingRadarrMovies = await getRadarrExistingMovies(radarrUrl, radarrKey);
    } catch { /* ignore */ }
  }

  for (const entry of allEntries) {
    const { media } = entry;
    const title = media.title.english || media.title.romaji;
    const isMovie = media.format === "MOVIE";

    const existing = await prisma.syncedTitle.findUnique({
      where: { anilistId: media.id },
    });

    if (existing && existing.syncStatus === "SYNCED") {
      result.skipped++;
      continue;
    }

    const syncedTitle = await prisma.syncedTitle.upsert({
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

    if (isMovie && radarrUrl && radarrKey && radarrRoot && radarrProfileId) {
      try {
        let movieData = null;

        if (media.idMal) {
          movieData = await searchRadarrByTitle(radarrUrl, radarrKey, title);
        } else {
          movieData = await searchRadarrByTitle(radarrUrl, radarrKey, title);
        }

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
            data: {
              syncStatus: "SYNCED",
              tmdbId: movieData.tmdbId,
              syncedAt: new Date(),
            },
          });
          await log("RADARR_ADD", title, "SKIPPED", "Already in Radarr");
          result.skipped++;
          continue;
        }

        const added = await addRadarrMovie(radarrUrl, radarrKey, {
          title: movieData.title,
          tmdbId: movieData.tmdbId,
          qualityProfileId: parseInt(radarrProfileId),
          rootFolderPath: radarrRoot,
          titleSlug: movieData.titleSlug,
          images: movieData.images,
          year: movieData.year,
        });

        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: {
            syncStatus: "SYNCED",
            radarrId: added.id,
            tmdbId: movieData.tmdbId,
            syncedAt: new Date(),
          },
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
    } else if (!isMovie && sonarrUrl && sonarrKey && sonarrRoot && sonarrProfileId) {
      try {
        let seriesData = null;

        if (media.idMal) {
          seriesData = await searchSonarrByTitle(sonarrUrl, sonarrKey, title);

          if (!seriesData) {
            seriesData = await lookupSonarrSeries(sonarrUrl, sonarrKey, media.idMal);
          }
        } else {
          seriesData = await searchSonarrByTitle(sonarrUrl, sonarrKey, title);
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
            data: {
              syncStatus: "SYNCED",
              tvdbId: seriesData.tvdbId,
              syncedAt: new Date(),
            },
          });
          await log("SONARR_ADD", title, "SKIPPED", "Already in Sonarr");
          result.skipped++;
          continue;
        }

        const added = await addSonarrSeries(sonarrUrl, sonarrKey, {
          title: seriesData.title,
          tvdbId: seriesData.tvdbId,
          qualityProfileId: parseInt(sonarrProfileId),
          rootFolderPath: sonarrRoot,
          titleSlug: seriesData.titleSlug,
          images: seriesData.images,
          seasons: seriesData.seasons,
        });

        await prisma.syncedTitle.update({
          where: { id: syncedTitle.id },
          data: {
            syncStatus: "SYNCED",
            sonarrId: added.id,
            tvdbId: seriesData.tvdbId,
            syncedAt: new Date(),
          },
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
    } else {
      await prisma.syncedTitle.update({
        where: { id: syncedTitle.id },
        data: { syncStatus: "SKIPPED", failReason: "No matching *arr service configured" },
      });
      result.skipped++;
    }
  }

  await setSetting(SETTING_KEYS.LAST_SYNC_AT, new Date().toISOString());
  await log("SYNC_RUN", null, "SUCCESS", `Completed: ${result.added} added, ${result.skipped} skipped, ${result.failed} failed`);

  return result;
}
