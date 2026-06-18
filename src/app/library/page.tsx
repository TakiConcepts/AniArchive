"use client";

import { useState } from "react";
import { useLibrary } from "@/hooks/use-library";
import { Search, Grid3X3, List, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const STATUS_LABELS: Record<string, string> = {
  CURRENT: "Watching",
  COMPLETED: "Completed",
  PLANNING: "Planning",
  PAUSED: "Paused",
  DROPPED: "Dropped",
};

const SYNC_STYLES: Record<string, string> = {
  SYNCED: "bg-success",
  PENDING: "bg-warning",
  FAILED: "bg-danger",
  SKIPPED: "bg-muted",
};

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");
  const [view, setView] = useState<"poster" | "table">("poster");

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (formatFilter) params.format = formatFilter;
  if (syncFilter) params.syncStatus = syncFilter;

  const { titles, isLoading } = useLibrary(params);

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-surface-light border border-border rounded px-3 flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Filter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-sm h-[30px] focus:ring-0 focus:shadow-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-[13px] h-[30px] py-0"
        >
          <option value="">All Statuses</option>
          <option value="CURRENT">Watching</option>
          <option value="COMPLETED">Completed</option>
          <option value="PLANNING">Planning</option>
          <option value="PAUSED">Paused</option>
          <option value="DROPPED">Dropped</option>
        </select>

        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="text-[13px] h-[30px] py-0"
        >
          <option value="">All Formats</option>
          <option value="TV">TV</option>
          <option value="MOVIE">Movie</option>
          <option value="OVA">OVA</option>
          <option value="ONA">ONA</option>
          <option value="SPECIAL">Special</option>
        </select>

        <select
          value={syncFilter}
          onChange={(e) => setSyncFilter(e.target.value)}
          className="text-[13px] h-[30px] py-0"
        >
          <option value="">All Sync</option>
          <option value="SYNCED">Synced</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="SKIPPED">Skipped</option>
        </select>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-muted mr-2">{titles.length} titles</span>
          <button
            onClick={() => setView("poster")}
            className={cn(
              "p-1.5 rounded transition-colors",
              view === "poster" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "p-1.5 rounded transition-colors",
              view === "table" ? "bg-primary text-white" : "text-muted hover:text-foreground"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <p className="text-muted text-sm">Loading library...</p>
        ) : !titles.length ? (
          <div className="text-center py-20">
            <p className="text-muted">No titles found</p>
            <p className="text-muted text-sm mt-1">
              Configure your settings and run a sync to populate your library.
            </p>
          </div>
        ) : view === "poster" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {titles.map((title) => (
              <PosterCard key={title.id} title={title} />
            ))}
          </div>
        ) : (
          <div className="bg-surface rounded border border-border overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Sync</th>
                  <th>Jellyfin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {titles.map((title) => (
                  <tr key={title.id}>
                    <td>
                      <span className="text-foreground-bright font-medium">
                        {title.titleEnglish || title.title}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-muted">{title.format || "—"}</span>
                    </td>
                    <td>
                      <span className="text-xs">{STATUS_LABELS[title.anilistStatus] || title.anilistStatus}</span>
                    </td>
                    <td>
                      {title.userScore || title.averageScore ? (
                        <span className="text-sm font-mono">
                          {(title.userScore || title.averageScore)!.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">no rating</span>
                      )}
                    </td>
                    <td>
                      <SyncBadge status={title.syncStatus} />
                    </td>
                    <td>
                      {title.inJellyfin && (
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30">
                          IN LIBRARY
                        </span>
                      )}
                    </td>
                    <td>
                      <a
                        href={`https://anilist.co/anime/${title.anilistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-primary"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SYNCED: "bg-success/15 text-success border-success/30",
    PENDING: "bg-warning/15 text-warning border-warning/30",
    FAILED: "bg-danger/15 text-danger border-danger/30",
    SKIPPED: "bg-muted/15 text-muted border-muted/30",
  };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${styles[status] || "bg-muted/15 text-muted border-muted/30"}`}>
      {status}
    </span>
  );
}

function PosterCard({
  title,
}: {
  title: {
    id: number;
    anilistId: number;
    title: string;
    titleEnglish: string | null;
    coverImage: string | null;
    format: string | null;
    anilistStatus: string;
    userScore: number | null;
    averageScore: number | null;
    syncStatus: string;
    qualityProfile: string | null;
    failReason: string | null;
    inJellyfin: boolean;
  };
}) {
  const displayTitle = title.titleEnglish || title.title;
  const score = title.userScore || title.averageScore;

  return (
    <a
      href={`https://anilist.co/anime/${title.anilistId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative aspect-[2/3] bg-surface rounded overflow-hidden border border-border group-hover:border-primary/60 transition-colors">
        {title.coverImage ? (
          <Image
            src={title.coverImage}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 14vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            No image
          </div>
        )}

        {/* Sync status indicator bar at bottom */}
        <div className={`absolute bottom-0 left-0 right-0 h-[3px] ${SYNC_STYLES[title.syncStatus] || "bg-muted"}`} />

        {title.inJellyfin && (
          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-500/90 text-white">
            IN JELLYFIN
          </span>
        )}

        {/* Top-left badges */}
        <div className="absolute top-0 left-0 right-0 p-1.5 flex justify-between">
          {title.format && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-black/75 text-white backdrop-blur-sm">
              {title.format}
            </span>
          )}
          {score ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-primary/90 text-white">
              {score.toFixed(1)}
            </span>
          ) : (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-black/60 text-muted backdrop-blur-sm">
              no rating
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <div>
            <p className="text-[11px] text-white/80 leading-tight">
              {STATUS_LABELS[title.anilistStatus] || title.anilistStatus}
            </p>
            {title.failReason && (
              <p className="text-[10px] text-danger mt-0.5 leading-tight">{title.failReason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Title below poster */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[12px] font-medium text-foreground-bright leading-tight truncate" title={displayTitle}>
          {displayTitle}
        </p>
      </div>
    </a>
  );
}
