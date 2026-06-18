import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync-engine";
import { prisma } from "@/lib/db";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const lastSync = await getSetting(SETTING_KEYS.LAST_SYNC_AT);
  const totalSynced = await prisma.syncedTitle.count({ where: { syncStatus: "SYNCED" } });
  const totalPending = await prisma.syncedTitle.count({ where: { syncStatus: "PENDING" } });
  const totalFailed = await prisma.syncedTitle.count({ where: { syncStatus: "FAILED" } });
  const recentLogs = await prisma.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    lastSync,
    totalSynced,
    totalPending,
    totalFailed,
    recentLogs,
  });
}
