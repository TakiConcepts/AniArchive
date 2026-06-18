import { NextResponse } from "next/server";
import { testRadarrConnection, getRadarrProfiles, getRadarrRootFolders } from "@/lib/radarr";

export async function POST(req: Request) {
  const { url, apiKey, action } = await req.json();

  if (!url || !apiKey) {
    return NextResponse.json({ error: "URL and API key required" }, { status: 400 });
  }

  try {
    if (action === "profiles") {
      const profiles = await getRadarrProfiles(url, apiKey);
      return NextResponse.json({ profiles });
    }
    if (action === "rootfolders") {
      const folders = await getRadarrRootFolders(url, apiKey);
      return NextResponse.json({ folders });
    }

    const ok = await testRadarrConnection(url, apiKey);
    const profiles = await getRadarrProfiles(url, apiKey);
    const folders = await getRadarrRootFolders(url, apiKey);
    return NextResponse.json({ connected: ok, profiles, folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message, connected: false }, { status: 500 });
  }
}
