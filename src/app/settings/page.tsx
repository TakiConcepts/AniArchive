"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/hooks/use-settings";
import {
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "CURRENT", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNING", label: "Planning" },
  { value: "PAUSED", label: "Paused" },
  { value: "DROPPED", label: "Dropped" },
];

const FORMAT_OPTIONS = [
  { value: "TV", label: "TV Series" },
  { value: "TV_SHORT", label: "TV Short" },
  { value: "MOVIE", label: "Movie" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "SPECIAL", label: "Special" },
];

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sonarrTest, setSonarrTest] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [radarrTest, setRadarrTest] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [jellyfinTest, setJellyfinTest] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [sonarrProfiles, setSonarrProfiles] = useState<{ id: number; name: string }[]>([]);
  const [sonarrFolders, setSonarrFolders] = useState<{ path: string }[]>([]);
  const [radarrProfiles, setRadarrProfiles] = useState<{ id: number; name: string }[]>([]);
  const [radarrFolders, setRadarrFolders] = useState<{ path: string }[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isLoading && settings && !initialized.current) {
      setForm(settings);
      initialized.current = true;
    }
  }, [isLoading, settings]);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayField(key: string, value: string) {
    const current = form[key] ? JSON.parse(form[key]) : [];
    const next = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    updateField(key, JSON.stringify(next));
  }

  function getArrayField(key: string): string[] {
    try {
      return form[key] ? JSON.parse(form[key]) : [];
    } catch {
      return [];
    }
  }

  async function handleSave() {
    setSaving(true);
    await updateSettings(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testSonarr() {
    setSonarrTest("testing");
    try {
      const res = await fetch("/api/sonarr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.sonarr_url, apiKey: form.sonarr_api_key }),
      });
      const data = await res.json();
      if (data.connected) {
        setSonarrTest("ok");
        if (data.profiles) setSonarrProfiles(data.profiles);
        if (data.folders) setSonarrFolders(data.folders);
      } else {
        setSonarrTest("fail");
      }
    } catch {
      setSonarrTest("fail");
    }
  }

  async function testRadarr() {
    setRadarrTest("testing");
    try {
      const res = await fetch("/api/radarr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.radarr_url, apiKey: form.radarr_api_key }),
      });
      const data = await res.json();
      if (data.connected) {
        setRadarrTest("ok");
        if (data.profiles) setRadarrProfiles(data.profiles);
        if (data.folders) setRadarrFolders(data.folders);
      } else {
        setRadarrTest("fail");
      }
    } catch {
      setRadarrTest("fail");
    }
  }

  async function testJellyfin() {
    setJellyfinTest("testing");
    try {
      const res = await fetch("/api/jellyfin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.jellyfin_url, apiKey: form.jellyfin_api_key }),
      });
      const data = await res.json();
      setJellyfinTest(data.connected ? "ok" : "fail");
    } catch {
      setJellyfinTest("fail");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted p-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-foreground-bright">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded text-[13px] font-medium transition-colors disabled:opacity-50"
        >
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Saved!" : saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="p-6 max-w-4xl">
        {/* Media Management (AniList) */}
        <Section title="Media Management">
          <Row label="AniList Username" hint="Your AniList profile must be public.">
            <input
              type="text"
              value={form.anilist_username || ""}
              onChange={(e) => updateField("anilist_username", e.target.value)}
              placeholder="Username"
              className="w-72"
            />
          </Row>
        </Section>

        {/* Sonarr */}
        <Section title="Sonarr" accent="sonarr">
          <Row label="Host" hint="URL including port">
            <input
              type="text"
              value={form.sonarr_url || ""}
              onChange={(e) => updateField("sonarr_url", e.target.value)}
              placeholder="http://localhost:8989"
              className="w-72"
            />
          </Row>
          <Row label="API Key">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={form.sonarr_api_key || ""}
                onChange={(e) => updateField("sonarr_api_key", e.target.value)}
                placeholder="API Key"
                className="w-72"
              />
              <button
                onClick={testSonarr}
                disabled={sonarrTest === "testing"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light hover:bg-surface-hover border border-border text-foreground rounded text-[13px] transition-colors h-[35px]"
              >
                {sonarrTest === "testing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Test
              </button>
              {sonarrTest === "ok" && <CheckCircle2 className="w-4 h-4 text-success" />}
              {sonarrTest === "fail" && <XCircle className="w-4 h-4 text-danger" />}
            </div>
          </Row>
          {sonarrProfiles.length > 0 && (
            <Row label="Quality Profile">
              <select
                value={form.sonarr_quality_profile_id || ""}
                onChange={(e) => updateField("sonarr_quality_profile_id", e.target.value)}
                className="w-72"
              >
                <option value="">Select profile...</option>
                {sonarrProfiles.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </Row>
          )}
          {sonarrFolders.length > 0 && (
            <Row label="Root Folder">
              <select
                value={form.sonarr_root_folder || ""}
                onChange={(e) => updateField("sonarr_root_folder", e.target.value)}
                className="w-72"
              >
                <option value="">Select folder...</option>
                {sonarrFolders.map((f) => (
                  <option key={f.path} value={f.path}>{f.path}</option>
                ))}
              </select>
            </Row>
          )}
        </Section>

        {/* Radarr */}
        <Section title="Radarr" accent="radarr">
          <Row label="Host" hint="URL including port">
            <input
              type="text"
              value={form.radarr_url || ""}
              onChange={(e) => updateField("radarr_url", e.target.value)}
              placeholder="http://localhost:7878"
              className="w-72"
            />
          </Row>
          <Row label="API Key">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={form.radarr_api_key || ""}
                onChange={(e) => updateField("radarr_api_key", e.target.value)}
                placeholder="API Key"
                className="w-72"
              />
              <button
                onClick={testRadarr}
                disabled={radarrTest === "testing"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light hover:bg-surface-hover border border-border text-foreground rounded text-[13px] transition-colors h-[35px]"
              >
                {radarrTest === "testing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Test
              </button>
              {radarrTest === "ok" && <CheckCircle2 className="w-4 h-4 text-success" />}
              {radarrTest === "fail" && <XCircle className="w-4 h-4 text-danger" />}
            </div>
          </Row>
          {radarrProfiles.length > 0 && (
            <Row label="Quality Profile">
              <select
                value={form.radarr_quality_profile_id || ""}
                onChange={(e) => updateField("radarr_quality_profile_id", e.target.value)}
                className="w-72"
              >
                <option value="">Select profile...</option>
                {radarrProfiles.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </Row>
          )}
          {radarrFolders.length > 0 && (
            <Row label="Root Folder">
              <select
                value={form.radarr_root_folder || ""}
                onChange={(e) => updateField("radarr_root_folder", e.target.value)}
                className="w-72"
              >
                <option value="">Select folder...</option>
                {radarrFolders.map((f) => (
                  <option key={f.path} value={f.path}>{f.path}</option>
                ))}
              </select>
            </Row>
          )}
        </Section>

        {/* Jellyfin */}
        <Section title="Jellyfin" accent="jellyfin">
          <Row label="Host" hint="URL including port">
            <input
              type="text"
              value={form.jellyfin_url || ""}
              onChange={(e) => updateField("jellyfin_url", e.target.value)}
              placeholder="http://localhost:8096"
              className="w-72"
            />
          </Row>
          <Row label="API Key">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={form.jellyfin_api_key || ""}
                onChange={(e) => updateField("jellyfin_api_key", e.target.value)}
                placeholder="API Key"
                className="w-72"
              />
              <button
                onClick={testJellyfin}
                disabled={jellyfinTest === "testing"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light hover:bg-surface-hover border border-border text-foreground rounded text-[13px] transition-colors h-[35px]"
              >
                {jellyfinTest === "testing" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Test
              </button>
              {jellyfinTest === "ok" && <CheckCircle2 className="w-4 h-4 text-success" />}
              {jellyfinTest === "fail" && <XCircle className="w-4 h-4 text-danger" />}
            </div>
          </Row>
        </Section>

        {/* Sync Rules */}
        <Section title="Import Lists">
          <Row label="Minimum Rating" hint="Only sync titles at or above this score (0-10)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={form.min_rating_threshold || "0"}
                onChange={(e) => updateField("min_rating_threshold", e.target.value)}
                className="w-48 accent-primary"
              />
              <span className="text-sm font-mono font-bold text-primary min-w-[2rem] text-right">
                {form.min_rating_threshold || "0"}
              </span>
            </div>
          </Row>

          <Row label="List Statuses" hint="Which AniList statuses to sync">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const selected = getArrayField("sync_statuses").includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArrayField("sync_statuses", opt.value)}
                    className={`px-3 py-1 rounded text-[13px] font-medium border transition-colors ${
                      selected
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-surface-light text-muted border-border hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Formats" hint="Which media formats to include">
            <div className="flex flex-wrap gap-1.5">
              {FORMAT_OPTIONS.map((opt) => {
                const selected = getArrayField("sync_formats").includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleArrayField("sync_formats", opt.value)}
                    className={`px-3 py-1 rounded text-[13px] font-medium border transition-colors ${
                      selected
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-surface-light text-muted border-border hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Row>

          <Row label="Auto-Sync">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateField("sync_enabled", form.sync_enabled === "true" ? "false" : "true")}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form.sync_enabled === "true" ? "bg-primary" : "bg-border"
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  form.sync_enabled === "true" ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
              {form.sync_enabled === "true" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">every</span>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={form.sync_interval_minutes || "60"}
                    onChange={(e) => updateField("sync_interval_minutes", e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted">minutes</span>
                </div>
              )}
            </div>
          </Row>
        </Section>

        {/* Quality */}
        <Section title="Quality">
          <Row label="Default Quality" hint="Quality preference for standard titles">
            <div className="flex gap-2">
              {[
                { value: "bluray", label: "Blu-ray" },
                { value: "streaming", label: "Streaming (Web-DL)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateField("quality_default", opt.value)}
                  className={`px-4 py-2 rounded text-[13px] font-medium border transition-colors ${
                    form.quality_default === opt.value
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-surface-light text-muted border-border hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Score Threshold" hint="Titles at or above this score use the high-quality profile. Set 0 to disable.">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={form.quality_score_threshold || "0"}
                onChange={(e) => updateField("quality_score_threshold", e.target.value)}
                className="w-48 accent-primary"
              />
              <span className="text-sm font-mono font-bold text-primary min-w-[2rem] text-right">
                {form.quality_score_threshold || "0"}
              </span>
            </div>
          </Row>

          {parseFloat(form.quality_score_threshold || "0") > 0 && (
            <>
              {sonarrProfiles.length > 0 && (
                <Row label="Sonarr High-Score Profile" hint="Quality profile for highly-rated series">
                  <select
                    value={form.sonarr_quality_profile_high_id || ""}
                    onChange={(e) => updateField("sonarr_quality_profile_high_id", e.target.value)}
                    className="w-72"
                  >
                    <option value="">Same as default</option>
                    {sonarrProfiles.map((p) => (
                      <option key={p.id} value={p.id.toString()}>{p.name}</option>
                    ))}
                  </select>
                </Row>
              )}
              {radarrProfiles.length > 0 && (
                <Row label="Radarr High-Score Profile" hint="Quality profile for highly-rated movies">
                  <select
                    value={form.radarr_quality_profile_high_id || ""}
                    onChange={(e) => updateField("radarr_quality_profile_high_id", e.target.value)}
                    className="w-72"
                  >
                    <option value="">Same as default</option>
                    {radarrProfiles.map((p) => (
                      <option key={p.id} value={p.id.toString()}>{p.name}</option>
                    ))}
                  </select>
                </Row>
              )}
            </>
          )}
        </Section>

        {/* Deals */}
        <Section title="Notifications">
          <Row label="Blu-ray Deals" hint="Search for cheap physical media for your synced titles">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateField("deals_enabled", form.deals_enabled === "true" ? "false" : "true")}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form.deals_enabled === "true" ? "bg-primary" : "bg-border"
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  form.deals_enabled === "true" ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </Row>

          {form.deals_enabled === "true" && (
            <>
              <Row label="Max Price (GBP)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.deals_max_price || "30"}
                  onChange={(e) => updateField("deals_max_price", e.target.value)}
                  className="w-24"
                />
              </Row>
              <Row label="Sources">
                <div className="flex flex-wrap gap-1.5">
                  {["ebay", "amazon", "cex"].map((source) => {
                    const selected = getArrayField("deals_sources").includes(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleArrayField("deals_sources", source)}
                        className={`px-3 py-1 rounded text-[13px] font-medium border capitalize transition-colors ${
                          selected
                            ? "bg-radarr/15 text-radarr border-radarr/40"
                            : "bg-surface-light text-muted border-border hover:text-foreground"
                        }`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
              </Row>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const accentColor = accent === "sonarr" ? "border-l-sonarr" : accent === "radarr" ? "border-l-radarr" : accent === "jellyfin" ? "border-l-purple-500" : "border-l-primary";
  return (
    <div className={`bg-surface rounded border border-border border-l-4 ${accentColor} mb-5`}>
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground-bright">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3 flex items-start gap-6">
      <div className="w-44 flex-shrink-0 pt-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && <p className="text-[11px] text-muted mt-0.5 leading-tight">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
