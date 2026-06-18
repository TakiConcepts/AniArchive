"use client";

import { useState, useEffect } from "react";
import { Search, ExternalLink, RefreshCw } from "lucide-react";

interface Deal {
  id: number;
  anilistId: number | null;
  title: string;
  price: number;
  currency: string;
  source: string;
  url: string | null;
  condition: string;
  foundAt: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    setLoading(true);
    try {
      const res = await fetch("/api/deals");
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function checkDeals() {
    setChecking(true);
    try {
      await fetch("/api/deals/check", { method: "POST" });
      await fetchDeals();
    } catch {
      alert("Deal check failed");
    } finally {
      setChecking(false);
    }
  }

  const sourceStyles: Record<string, string> = {
    ebay: "bg-info/15 text-info border-info/30",
    amazon: "bg-radarr/15 text-radarr border-radarr/30",
    cex: "bg-primary/15 text-primary border-primary/30",
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground-bright">Blu-ray Deals</h1>
        <button
          onClick={checkDeals}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          {checking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          {checking ? "Checking..." : "Check for Deals"}
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-muted text-sm">Loading deals...</p>
        ) : !deals.length ? (
          <div className="text-center py-20">
            <p className="text-muted">No deals found</p>
            <p className="text-muted text-sm mt-1">
              Enable deal tracking in Settings and sync some titles first.
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded border border-border overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Source</th>
                  <th>Condition</th>
                  <th>Price</th>
                  <th>Found</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <span className="text-foreground-bright font-medium">{deal.title}</span>
                    </td>
                    <td>
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border capitalize ${sourceStyles[deal.source] || "bg-muted/15 text-muted border-muted/30"}`}>
                        {deal.source}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-muted">
                        {deal.condition === "LIKE_NEW" ? "Like New" : deal.condition === "NEW" ? "New" : "Used"}
                      </span>
                    </td>
                    <td>
                      {deal.price > 0 ? (
                        <span className="text-sm font-medium text-success">
                          {deal.currency === "GBP" ? "£" : "$"}{deal.price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Check link</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-muted">
                        {new Date(deal.foundAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      {deal.url && (
                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
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
