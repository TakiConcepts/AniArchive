import { NextResponse } from "next/server";
import { checkDealsForLibrary } from "@/lib/deals";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export async function POST() {
  try {
    const maxPriceStr = await getSetting(SETTING_KEYS.DEALS_MAX_PRICE);
    const sourcesStr = await getSetting(SETTING_KEYS.DEALS_SOURCES);

    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : 30;
    const sources = sourcesStr ? JSON.parse(sourcesStr) : [];

    const found = await checkDealsForLibrary(maxPrice, sources);
    return NextResponse.json({ found });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deal check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
