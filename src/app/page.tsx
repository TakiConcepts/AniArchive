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
  ArrowRight,
  Download,
  Library,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { syncStatus, isLoading, mutate } = useSyncStatus();
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

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

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Import failed: ${data.error}`);
      } else {
        alert(`Imported ${data.imported} titles from AniList`);
      }
      mutate();
    } catch {
      alert("Import request failed");
    } finally {
      setImporting(false);
    }
  }

  const lastSyncFormatted = syncStatus?.lastSync
    ? new Date(syncStatus.lastSync).toLocaleString()
    : "Never";

  return (
    <div>
      {/* Page toolbar */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground-bright">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            disabled={importing || syncing}
            className="flex items-center gap-2 px-4 py-1.5 bg-surface-light hover:bg-surface-hover border border-border text-foreground rounded text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <Download className={`w-3.5 h-3.5 ${importing ? "animate-bounce" : ""}`} />
            {importing ? "Importing..." : "Import AniList"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || importing}
            className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Total Titles"
            value={syncStatus?.totalTitles ?? 0}
            icon={<Library className="w-8 h-8" />}
            color="text-primary"
            iconBg="bg-primary/10"
          />
          <StatCard
            label="Synced"
            value={syncStatus?.totalSynced ?? 0}
            icon={<CheckCircle2 className="w-8 h-8" />}
            color="text-success"
            iconBg="bg-success/10"
          />
          <StatCard
            label="Pending"
            value={syncStatus?.totalPending ?? 0}
            icon={<Clock className="w-8 h-8" />}
            color="text-warning"
            iconBg="bg-warning/10"
          />
          <StatCard
            label="Failed"
            value={syncStatus?.totalFailed ?? 0}
            icon={<AlertTriangle className="w-8 h-8" />}
            color="text-danger"
            iconBg="bg-danger/10"
          />
          <div className="bg-surface rounded border border-border p-4">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">Last Sync</div>
            <div className="text-sm font-medium text-foreground-bright">{lastSyncFormatted}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity log */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground-bright flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Recent Activity
                </h2>
                <Link href="/activity" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="p-4 text-muted text-sm">Loading...</div>
              ) : !syncStatus?.recentLogs?.length ? (
                <div className="p-6 text-center text-muted text-sm">
                  No activity yet. Configure your settings and run a sync.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncStatus.recentLogs.slice(0, 10).map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className="text-xs font-medium text-muted">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-foreground-bright">
                            {log.title || "—"}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={log.status} />
                        </td>
                        <td>
                          <span className="text-xs text-muted">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Deals sidebar */}
          <div>
            <div className="bg-surface rounded border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground-bright flex items-center gap-2">
                  <Disc3 className="w-4 h-4 text-radarr" />
                  Deal Alerts
                </h2>
                <Link href="/deals" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <DealAlerts />
            </div>
          </div>
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
  iconBg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
}) {
  return (
    <div className="bg-surface rounded border border-border p-4 flex items-center gap-4">
      <div className={`p-2 rounded ${iconBg} ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground-bright">{value}</div>
        <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: "bg-success/15 text-success border-success/30",
    FAILED: "bg-danger/15 text-danger border-danger/30",
    SKIPPED: "bg-warning/15 text-warning border-warning/30",
  };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${styles[status] || "bg-muted/15 text-muted border-muted/30"}`}>
      {status}
    </span>
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
      <div className="p-4">
        <p className="text-muted text-sm mb-3">No deals loaded yet.</p>
        <button
          onClick={loadDeals}
          className="text-xs text-primary hover:text-primary-hover font-medium"
        >
          Load deals
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-4 text-muted text-sm">Loading deals...</div>;

  return (
    <div className="divide-y divide-border">
      {deals.map((deal) => (
        <div key={deal.id} className="px-4 py-3 hover:bg-surface-light transition-colors">
          <p className="text-sm text-foreground-bright truncate">{deal.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-info/15 text-info border border-info/30 capitalize">
              {deal.source}
            </span>
            <span className="text-[11px] text-muted">{deal.condition}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
