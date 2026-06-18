import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const deals = await prisma.blurayDeal.findMany({
    orderBy: { foundAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ deals });
}
