"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<Record<string, string>>("/api/settings", fetcher);

  async function updateSettings(updates: Record<string, string>) {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    mutate();
  }

  return { settings: data || {}, error, isLoading, updateSettings, mutate };
}
