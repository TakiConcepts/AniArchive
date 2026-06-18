# AniArchive

Auto-sync your AniList anime library to Sonarr, Radarr, and Jellyfin.

## Features

- **AniList Integration** — Pulls your anime/movie list from AniList automatically
- **Sonarr & Radarr Sync** — Adds TV shows to Sonarr and movies to Radarr for automatic downloading
- **Smart Filtering** — Set minimum rating thresholds (e.g. only 7+ rated titles), filter by list status (Watching, Completed, Planning), and format (TV, Movie, OVA, etc.)
- **Quality Preferences** — Choose between Blu-ray or Streaming quality profiles that map to your Sonarr/Radarr quality profiles
- **Blu-ray Deal Finder** — Searches eBay, Amazon UK, and CeX for cheap physical Blu-ray copies of your anime and notifies you of deals
- **Auto-Sync** — Configurable periodic sync with customizable interval
- **Dashboard** — Overview of sync status, recent activity, and deal alerts

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4 (dark theme)
- SQLite via Prisma 7 + LibSQL adapter
- SWR for client-side data fetching

## Setup

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env
npx prisma migrate dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and configure your connections in Settings.

## Configuration

1. Go to **Settings**
2. Enter your **AniList username** (profile must be public)
3. Configure **Sonarr** — URL and API key, then test connection and select quality profile + root folder
4. Configure **Radarr** — Same as Sonarr
5. Set **Sync Rules** — Minimum rating, which list statuses to sync, which formats
6. Choose **Quality Preference** — Blu-ray or Streaming
7. Optionally enable **Blu-ray Deal Tracking**
8. Click **Save All**, then **Sync Now** on the Dashboard

## Pages

- `/` — Dashboard with sync stats, activity log, deal alerts
- `/library` — Browse all synced titles with filters
- `/deals` — Blu-ray deal finder with links to purchase
- `/settings` — All configuration in one place
