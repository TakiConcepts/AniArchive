import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const format = searchParams.get("format");
  const syncStatus = searchParams.get("syncStatus");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) where.anilistStatus = status;
  if (format) where.format = format;
  if (syncStatus) where.syncStatus = syncStatus;

  let titles = await prisma.syncedTitle.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  if (search) {
    const term = search.toLowerCase();
    titles = titles.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        (t.titleEnglish && t.titleEnglish.toLowerCase().includes(term))
    );
  }

  titles.sort((a, b) => {
    if (a.userScore && !b.userScore) return -1;
    if (!a.userScore && b.userScore) return 1;
    if (a.userScore && b.userScore) return b.userScore - a.userScore;
    return 0;
  });

  return NextResponse.json({ titles });
}
