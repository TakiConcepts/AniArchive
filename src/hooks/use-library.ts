"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncedTitle {
  id: number;
  anilistId: number;
  title: string;
  titleEnglish: string | null;
  coverImage: string | null;
  mediaType: string;
  format: string | null;
  anilistStatus: string;
  userScore: number | null;
  averageScore: number | null;
  syncStatus: string;
  qualityProfile: string | null;
  failReason: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useLibrary(params?: Record<string, string>) {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  const { data, error, isLoading, mutate } = useSWR<{ titles: SyncedTitle[] }>(
    `/api/library${query}`,
    fetcher
  );

  return { titles: data?.titles || [], error, isLoading, mutate };
}
