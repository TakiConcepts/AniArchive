"use client";

import { useState } from "react";
import { useLibrary } from "@/hooks/use-library";
import { Library, Search, Filter, ExternalLink } from "lucide-react";
import Image from "next/image";

const STATUS_COLORS: Record<string, string> = {
  CURRENT: "bg-success/20 text-success",
  COMPLETED: "bg-primary/20 text-primary",
  PLANNING: "bg-warning/20 text-warning",
  PAUSED: "bg-muted/20 text-muted",
  DROPPED: "bg-danger/20 text-danger",
};

const SYNC_COLORS: Record<string, string> = {
  SYNCED: "bg-success/20 text-success",
  PENDING: "bg-warning/20 text-warning",
  FAILED: "bg-danger/20 text-danger",
  SKIPPED: "bg-muted/20 text-muted",
};

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (formatFilter) params.format = formatFilter;
  if (syncFilter) params.syncStatus = syncFilter;

  const { titles, isLoading } = useLibrary(params);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="w-6 h-6" />
            Library
          </h1>
          <p className="text-muted text-sm mt-1">
            {titles.length} titles in your library
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-sm focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-surface-light"
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
              className="text-sm bg-surface-light"
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
              className="text-sm bg-surface-light"
            >
              <option value="">All Sync</option>
              <option value="SYNCED">Synced</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted">Loading library...</p>
      ) : !titles.length ? (
        <div className="text-center py-16">
          <Library className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">No titles yet</p>
          <p className="text-muted text-sm mt-1">
            Configure your settings and run a sync to populate your library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {titles.map((title) => (
            <TitleCard key={title.id} title={title} />
          ))}
        </div>
      )}
    </div>
  );
}

function TitleCard({
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
  };
}) {
  const displayTitle = title.titleEnglish || title.title;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="relative aspect-[3/4] bg-surface-light">
        {title.coverImage ? (
          <Image
            src={title.coverImage}
            alt={displayTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            No image
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {title.format && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
              {title.format}
            </span>
          )}
          {title.userScore ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/90 text-white">
              {title.userScore.toFixed(1)}
            </span>
          ) : title.averageScore ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/90 text-white">
              {title.averageScore.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* AniList link */}
        <a
          href={`https://anilist.co/anime/${title.anilistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium truncate" title={displayTitle}>
          {displayTitle}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              STATUS_COLORS[title.anilistStatus] || "bg-muted/20 text-muted"
            }`}
          >
            {title.anilistStatus}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              SYNC_COLORS[title.syncStatus] || "bg-muted/20 text-muted"
            }`}
          >
            {title.syncStatus}
          </span>
        </div>
        {title.failReason && (
          <p className="text-[10px] text-danger mt-1 truncate" title={title.failReason}>
            {title.failReason}
          </p>
        )}
      </div>
    </div>
  );
}
