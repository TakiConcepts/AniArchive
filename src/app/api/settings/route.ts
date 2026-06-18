import { NextResponse } from "next/server";
import { getAllSettings, setSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const body = await req.json();
  await setSettings(body);
  return NextResponse.json({ ok: true });
}
