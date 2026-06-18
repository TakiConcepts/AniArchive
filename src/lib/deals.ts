import { prisma } from "./db";
import type { DealResult } from "@/types";

interface CexBox {
  boxId: string;
  boxName: string;
  sellPrice: number;
  cashPrice: number;
  exchangePrice: number;
  categoryFriendlyName: string;
}

interface CexResponse {
  response: {
    data?: {
      boxes?: CexBox[];
    };
  };
}

async function searchCex(title: string, maxPrice: number): Promise<DealResult[]> {
  const deals: DealResult[] = [];
  try {
    const query = encodeURIComponent(`${title} blu-ray`);
    const res = await fetch(
      `https://wss2.cex.uk.webuy.io/v3/boxes?q=${query}&firstRecord=0&count=5&categoryIds=%5B621%5D`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return deals;

    const data: CexResponse = await res.json();
    const boxes = data.response?.data?.boxes || [];

    for (const box of boxes) {
      const price = box.sellPrice;
      if (maxPrice > 0 && price > maxPrice) continue;
      deals.push({
        title: box.boxName,
        price,
        currency: "GBP",
        source: "cex",
        url: `https://uk.webuy.com/product-detail?id=${encodeURIComponent(box.boxId)}`,
        condition: "USED",
      });
    }
  } catch {
    // CeX search is best-effort
  }
  return deals;
}

function generateEbayLink(title: string): DealResult {
  const query = encodeURIComponent(`${title} blu-ray`);
  return {
    title: `${title} (eBay search)`,
    price: 0,
    currency: "GBP",
    source: "ebay",
    url: `https://www.ebay.co.uk/sch/i.html?_nkw=${query}&_sacat=617&LH_BIN=1&_sop=15&rt=nc&LH_PrefLoc=1`,
    condition: "USED",
  };
}

function generateAmazonLink(title: string): DealResult {
  const query = encodeURIComponent(`${title} blu-ray`);
  return {
    title: `${title} (Amazon search)`,
    price: 0,
    currency: "GBP",
    source: "amazon",
    url: `https://www.amazon.co.uk/s?k=${query}&i=dvd&rh=p_n_binding_browse-bin%3A383380011`,
    condition: "NEW",
  };
}

export async function checkDealsForLibrary(maxPrice: number, sources: string[]): Promise<number> {
  const titles = await prisma.syncedTitle.findMany({
    select: { anilistId: true, title: true, titleEnglish: true },
  });

  let found = 0;
  const enabledSources = sources.length > 0 ? sources : ["cex", "ebay", "amazon"];

  for (const t of titles) {
    const searchTitle = t.titleEnglish || t.title;
    const allDeals: DealResult[] = [];

    if (enabledSources.includes("cex")) {
      const cexDeals = await searchCex(searchTitle, maxPrice);
      allDeals.push(...cexDeals);
    }

    if (enabledSources.includes("ebay")) {
      allDeals.push(generateEbayLink(searchTitle));
    }

    if (enabledSources.includes("amazon")) {
      allDeals.push(generateAmazonLink(searchTitle));
    }

    for (const deal of allDeals) {
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
            title: deal.title,
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
