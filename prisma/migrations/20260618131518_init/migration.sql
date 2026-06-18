-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncedTitle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "anilistId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "coverImage" TEXT,
    "mediaType" TEXT NOT NULL,
    "format" TEXT,
    "anilistStatus" TEXT NOT NULL,
    "userScore" REAL,
    "averageScore" REAL,
    "sonarrId" INTEGER,
    "radarrId" INTEGER,
    "tvdbId" INTEGER,
    "tmdbId" INTEGER,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "qualityProfile" TEXT,
    "failReason" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BlurayDeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "anilistId" INTEGER,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "source" TEXT NOT NULL,
    "url" TEXT,
    "condition" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "titleId" INTEGER,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncedTitle_anilistId_key" ON "SyncedTitle"("anilistId");
