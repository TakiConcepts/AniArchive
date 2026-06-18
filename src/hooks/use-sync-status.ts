"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncStatus {
  lastSync: string | null;
  totalSynced: number;
  totalPending: number;
  totalFailed: number;
  recentLogs: {
    id: number;
    action: string;
    title: string | null;
    status: string;
    details: string | null;
    createdAt: string;
  }[];
}

export function useSyncStatus() {
  const { data, error, isLoading, mutate } = useSWR<SyncStatus>("/api/sync", fetcher, {
    refreshInterval: 10000,
  });

  return { syncStatus: data, error, isLoading, mutate };
}
