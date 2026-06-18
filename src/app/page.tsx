"use client";

import { useState } from "react";
import { useSyncStatus } from "@/hooks/use-sync-status";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Disc3,
} from "lucide-react";

export default function Dashboard() {
  const { syncStatus, isLoading, mutate } = useSyncStatus();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(`Sync failed: ${data.error}`);
      }
      mutate();
    } catch {
      alert("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncFormatted = syncStatus?.lastSync
    ? new Date(syncStatus.lastSync).toLocaleString()
    : "Never";

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Overview of your AniList to Jellyfin pipeline
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Synced"
          value={syncStatus?.totalSynced ?? 0}
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
          color="text-success"
        />
        <StatCard
          label="Pending"
          value={syncStatus?.totalPending ?? 0}
          icon={<Clock className="w-5 h-5 text-warning" />}
          color="text-warning"
        />
        <StatCard
          label="Failed"
          value={syncStatus?.totalFailed ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          color="text-danger"
        />
        <StatCard
          label="Last Sync"
          value={lastSyncFormatted}
          icon={<Activity className="w-5 h-5 text-primary" />}
          color="text-primary"
          isText
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </h2>
          {isLoading ? (
            <p className="text-muted text-sm">Loading...</p>
          ) : !syncStatus?.recentLogs?.length ? (
            <p className="text-muted text-sm">
              No activity yet. Configure your settings and run a sync.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncStatus.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface-light"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      log.status === "SUCCESS"
                        ? "bg-success"
                        : log.status === "FAILED"
                        ? "bg-danger"
                        : "bg-warning"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted uppercase">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      {log.title && (
                        <span className="text-sm font-medium truncate">
                          {log.title}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted mt-0.5">{log.details}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-secondary" />
            Deal Alerts
          </h2>
          <DealAlerts />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  isText,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted">{label}</span>
        {icon}
      </div>
      <p className={`${isText ? "text-sm" : "text-2xl"} font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function DealAlerts() {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<
    { id: number; title: string; source: string; condition: string; url: string | null }[]
  >([]);

  async function loadDeals() {
    setLoading(true);
    try {
      const res = await fetch("/api/deals");
      const data = await res.json();
      setDeals(data.deals?.slice(0, 5) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!deals.length && !loading) {
    return (
      <div>
        <p className="text-muted text-sm mb-3">No deals loaded yet.</p>
        <button
          onClick={loadDeals}
          className="text-sm text-primary hover:text-primary-hover font-medium"
        >
          Load deals
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-muted text-sm">Loading deals...</p>;

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <div key={deal.id} className="p-3 rounded-lg bg-surface-light">
          <p className="text-sm font-medium truncate">{deal.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {deal.source}
            </span>
            <span className="text-xs text-muted">{deal.condition}</span>
          </div>
          {deal.url && (
            <a
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-secondary hover:underline mt-1 inline-block"
            >
              View listing
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
