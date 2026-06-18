"use client";

import { useSyncStatus } from "@/hooks/use-sync-status";

export default function ActivityPage() {
  const { syncStatus, isLoading } = useSyncStatus();

  return (
    <div>
      <div className="bg-surface border-b border-border px-6 py-3">
        <h1 className="text-base font-semibold text-foreground-bright">Activity</h1>
      </div>

      <div className="p-6">
        <div className="bg-surface rounded border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-muted text-sm">Loading...</div>
          ) : !syncStatus?.recentLogs?.length ? (
            <div className="p-6 text-center text-muted text-sm">
              No activity yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {syncStatus.recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
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
                      <span className="text-xs text-muted max-w-xs truncate block">
                        {log.details || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-muted whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
