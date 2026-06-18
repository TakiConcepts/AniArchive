import { prisma } from "./db";
import type { DealResult } from "@/types";

async function searchDeals(title: string, maxPrice: number): Promise<DealResult[]> {
  const deals: DealResult[] = [];

  try {
    const query = encodeURIComponent(`${title} blu-ray`);

    // eBay Browse API (production-safe approach using public search)
    const ebayUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${query}&_sacat=617&LH_BIN=1&_sop=15&rt=nc&LH_PrefLoc=1`;

    deals.push({
      title,
      price: 0,
      currency: "GBP",
      source: "ebay",
      url: ebayUrl,
      condition: "USED",
    });

    // Amazon UK search link
    const amazonUrl = `https://www.amazon.co.uk/s?k=${query}&i=dvd&rh=p_n_binding_browse-bin%3A383380011`;

    deals.push({
      title,
      price: 0,
      currency: "GBP",
      source: "amazon",
      url: amazonUrl,
      condition: "NEW",
    });

    // CeX search link
    const cexUrl = `https://uk.webuy.com/search?stext=${query}`;

    deals.push({
      title,
      price: 0,
      currency: "GBP",
      source: "cex",
      url: cexUrl,
      condition: "USED",
    });
  } catch {
    // Deal searching is best-effort
  }

  return deals.filter((d) => maxPrice <= 0 || d.price <= maxPrice || d.price === 0);
}

export async function checkDealsForLibrary(maxPrice: number, sources: string[]): Promise<number> {
  const titles = await prisma.syncedTitle.findMany({
    where: { syncStatus: "SYNCED" },
    select: { anilistId: true, title: true, titleEnglish: true },
  });

  let found = 0;

  for (const t of titles) {
    const searchTitle = t.titleEnglish || t.title;
    const deals = await searchDeals(searchTitle, maxPrice);

    const filteredDeals = sources.length > 0
      ? deals.filter((d) => sources.includes(d.source))
      : deals;

    for (const deal of filteredDeals) {
      const existing = await prisma.blurayDeal.findFirst({
        where: {
          anilistId: t.anilistId,
          source: deal.source,
          foundAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existing) {
        await prisma.blurayDeal.create({
          data: {
            anilistId: t.anilistId,
            title: searchTitle,
            price: deal.price,
            currency: deal.currency,
            source: deal.source,
            url: deal.url,
            condition: deal.condition,
          },
        });
        found++;
      }
    }
  }

  return found;
}
