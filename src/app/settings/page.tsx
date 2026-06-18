"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";
import {
  Settings as SettingsIcon,
  Save,
  TestTube,
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
  const [sonarrProfiles, setSonarrProfiles] = useState<{ id: number; name: string }[]>([]);
  const [sonarrFolders, setSonarrFolders] = useState<{ path: string }[]>([]);
  const [radarrProfiles, setRadarrProfiles] = useState<{ id: number; name: string }[]>([]);
  const [radarrFolders, setRadarrFolders] = useState<{ path: string }[]>([]);

  useEffect(() => {
    if (!isLoading && settings) {
      setForm(settings);
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
        body: JSON.stringify({
          url: form.sonarr_url,
          apiKey: form.sonarr_api_key,
        }),
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
        body: JSON.stringify({
          url: form.radarr_url,
          apiKey: form.radarr_api_key,
        }),
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-muted text-sm mt-1">
            Configure your connections and sync preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? "Saved!" : saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* AniList */}
      <Section title="AniList Connection">
        <Field label="AniList Username">
          <input
            type="text"
            value={form.anilist_username || ""}
            onChange={(e) => updateField("anilist_username", e.target.value)}
            placeholder="Your AniList username"
            className="w-full"
          />
          <p className="text-xs text-muted mt-1">
            Your AniList profile must be public for the sync to work.
          </p>
        </Field>
      </Section>

      {/* Sonarr */}
      <Section title="Sonarr (TV Shows / Anime Series)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sonarr URL">
            <input
              type="text"
              value={form.sonarr_url || ""}
              onChange={(e) => updateField("sonarr_url", e.target.value)}
              placeholder="http://localhost:8989"
              className="w-full"
            />
          </Field>
          <Field label="API Key">
            <input
              type="password"
              value={form.sonarr_api_key || ""}
              onChange={(e) => updateField("sonarr_api_key", e.target.value)}
              placeholder="Your Sonarr API key"
              className="w-full"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={testSonarr}
            disabled={sonarrTest === "testing"}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-border text-foreground rounded-lg text-sm transition-colors"
          >
            {sonarrTest === "testing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Test Connection
          </button>
          {sonarrTest === "ok" && (
            <span className="flex items-center gap-1 text-success text-sm">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </span>
          )}
          {sonarrTest === "fail" && (
            <span className="flex items-center gap-1 text-danger text-sm">
              <XCircle className="w-4 h-4" /> Failed
            </span>
          )}
        </div>

        {(sonarrProfiles.length > 0 || sonarrFolders.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Quality Profile">
              <select
                value={form.sonarr_quality_profile_id || ""}
                onChange={(e) =>
                  updateField("sonarr_quality_profile_id", e.target.value)
                }
                className="w-full"
              >
                <option value="">Select profile...</option>
                {sonarrProfiles.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Root Folder">
              <select
                value={form.sonarr_root_folder || ""}
                onChange={(e) =>
                  updateField("sonarr_root_folder", e.target.value)
                }
                className="w-full"
              >
                <option value="">Select folder...</option>
                {sonarrFolders.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.path}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Section>

      {/* Radarr */}
      <Section title="Radarr (Movies)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Radarr URL">
            <input
              type="text"
              value={form.radarr_url || ""}
              onChange={(e) => updateField("radarr_url", e.target.value)}
              placeholder="http://localhost:7878"
              className="w-full"
            />
          </Field>
          <Field label="API Key">
            <input
              type="password"
              value={form.radarr_api_key || ""}
              onChange={(e) => updateField("radarr_api_key", e.target.value)}
              placeholder="Your Radarr API key"
              className="w-full"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={testRadarr}
            disabled={radarrTest === "testing"}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-border text-foreground rounded-lg text-sm transition-colors"
          >
            {radarrTest === "testing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Test Connection
          </button>
          {radarrTest === "ok" && (
            <span className="flex items-center gap-1 text-success text-sm">
              <CheckCircle2 className="w-4 h-4" /> Connected
            </span>
          )}
          {radarrTest === "fail" && (
            <span className="flex items-center gap-1 text-danger text-sm">
              <XCircle className="w-4 h-4" /> Failed
            </span>
          )}
        </div>

        {(radarrProfiles.length > 0 || radarrFolders.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Quality Profile">
              <select
                value={form.radarr_quality_profile_id || ""}
                onChange={(e) =>
                  updateField("radarr_quality_profile_id", e.target.value)
                }
                className="w-full"
              >
                <option value="">Select profile...</option>
                {radarrProfiles.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Root Folder">
              <select
                value={form.radarr_root_folder || ""}
                onChange={(e) =>
                  updateField("radarr_root_folder", e.target.value)
                }
                className="w-full"
              >
                <option value="">Select folder...</option>
                {radarrFolders.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.path}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Section>

      {/* Sync Rules */}
      <Section title="Sync Rules">
        <Field label="Minimum Rating (0-10)">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={form.min_rating_threshold || "0"}
              onChange={(e) =>
                updateField("min_rating_threshold", e.target.value)
              }
              className="flex-1 accent-primary bg-transparent border-none p-0"
            />
            <span className="text-sm font-mono font-bold text-primary w-10 text-right">
              {form.min_rating_threshold || "0"}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Only sync titles with a score at or above this threshold. Uses user
            score if available, otherwise the AniList average.
          </p>
        </Field>

        <Field label="Sync List Statuses">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const selected = getArrayField("sync_statuses").includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleArrayField("sync_statuses", opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? "bg-primary text-white"
                      : "bg-surface-light text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Sync Formats">
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = getArrayField("sync_formats").includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleArrayField("sync_formats", opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? "bg-primary text-white"
                      : "bg-surface-light text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Auto-Sync">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                updateField(
                  "sync_enabled",
                  form.sync_enabled === "true" ? "false" : "true"
                )
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.sync_enabled === "true" ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  form.sync_enabled === "true"
                    ? "translate-x-6"
                    : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm">
              {form.sync_enabled === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>

        {form.sync_enabled === "true" && (
          <Field label="Sync Interval (minutes)">
            <input
              type="number"
              min="5"
              max="1440"
              value={form.sync_interval_minutes || "60"}
              onChange={(e) =>
                updateField("sync_interval_minutes", e.target.value)
              }
              className="w-32"
            />
          </Field>
        )}
      </Section>

      {/* Quality Preferences */}
      <Section title="Quality Preferences">
        <Field label="Default Quality">
          <div className="flex gap-3">
            {[
              { value: "bluray", label: "Blu-ray", desc: "Highest quality, larger files" },
              { value: "streaming", label: "Streaming", desc: "Web-DL quality, smaller files" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField("quality_default", opt.value)}
                className={`flex-1 p-4 rounded-xl border-2 transition-colors text-left ${
                  form.quality_default === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-light hover:border-muted"
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">
            This maps to your Sonarr/Radarr quality profiles. Make sure you have
            matching profiles configured in your *arr apps.
          </p>
        </Field>
      </Section>

      {/* Blu-ray Deals */}
      <Section title="Blu-ray Deal Notifications">
        <Field label="Deal Tracking">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                updateField(
                  "deals_enabled",
                  form.deals_enabled === "true" ? "false" : "true"
                )
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.deals_enabled === "true" ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  form.deals_enabled === "true"
                    ? "translate-x-6"
                    : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm">
              {form.deals_enabled === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="text-xs text-muted mt-2">
            When enabled, AniArchive will search for cheap Blu-ray copies of
            your synced titles on eBay, Amazon, and CeX.
          </p>
        </Field>

        {form.deals_enabled === "true" && (
          <>
            <Field label="Maximum Price (GBP)">
              <input
                type="number"
                min="0"
                step="1"
                value={form.deals_max_price || "30"}
                onChange={(e) => updateField("deals_max_price", e.target.value)}
                className="w-32"
              />
            </Field>

            <Field label="Deal Sources">
              <div className="flex flex-wrap gap-2">
                {["ebay", "amazon", "cex"].map((source) => {
                  const selected = getArrayField("deals_sources").includes(source);
                  return (
                    <button
                      key={source}
                      onClick={() => toggleArrayField("deals_sources", source)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                        selected
                          ? "bg-secondary text-white"
                          : "bg-surface-light text-muted hover:text-foreground"
                      }`}
                    >
                      {source}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 mb-6">
      <h2 className="text-lg font-semibold mb-5">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
