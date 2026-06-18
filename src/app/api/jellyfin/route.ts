import { NextResponse } from "next/server";
import { testJellyfinConnection } from "@/lib/jellyfin";

export async function POST(req: Request) {
  try {
    const { url, apiKey } = await req.json();
    if (!url || !apiKey) {
      return NextResponse.json({ connected: false, error: "Missing URL or API key" });
    }
    const connected = await testJellyfinConnection(url, apiKey);
    return NextResponse.json({ connected });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ connected: false, error: message });
  }
}
