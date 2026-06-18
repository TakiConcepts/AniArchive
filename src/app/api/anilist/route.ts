import { NextResponse } from "next/server";
import { fetchAniListUser } from "@/lib/anilist";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const username = await getSetting(SETTING_KEYS.ANILIST_USERNAME);
  if (!username) {
    return NextResponse.json({ error: "AniList username not configured" }, { status: 400 });
  }

  try {
    const lists = await fetchAniListUser(username);
    return NextResponse.json({ lists });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch AniList";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
