"use client";

import { useState, useEffect } from "react";
import { Disc3, Search, ExternalLink, RefreshCw } from "lucide-react";

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

  const sourceColors: Record<string, string> = {
    ebay: "bg-blue-500/20 text-blue-400",
    amazon: "bg-orange-500/20 text-orange-400",
    cex: "bg-purple-500/20 text-purple-400",
  };

  const conditionLabels: Record<string, string> = {
    NEW: "New",
    USED: "Used",
    LIKE_NEW: "Like New",
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Disc3 className="w-6 h-6" />
            Blu-ray Deals
          </h1>
          <p className="text-muted text-sm mt-1">
            Find cheap physical media for your anime collection
          </p>
        </div>
        <button
          onClick={checkDeals}
          disabled={checking}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {checking ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {checking ? "Checking..." : "Check for Deals"}
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading deals...</p>
      ) : !deals.length ? (
        <div className="text-center py-16">
          <Disc3 className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted text-lg">No deals found</p>
          <p className="text-muted text-sm mt-1">
            Enable deal tracking in Settings and sync some titles first, then
            click &quot;Check for Deals&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{deal.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      sourceColors[deal.source] || "bg-muted/20 text-muted"
                    }`}
                  >
                    {deal.source}
                  </span>
                  <span className="text-xs text-muted">
                    {conditionLabels[deal.condition] || deal.condition}
                  </span>
                  <span className="text-xs text-muted">
                    Found {new Date(deal.foundAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {deal.price > 0 && (
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    {deal.currency === "GBP" ? "£" : "$"}
                    {deal.price.toFixed(2)}
                  </p>
                </div>
              )}

              {deal.url && (
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-surface-light hover:bg-border rounded-lg text-sm text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
