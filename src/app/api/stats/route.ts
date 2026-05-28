// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getStats, getCategoryStats } from "@/lib/queries";

export async function GET() {
  const [stats, categories] = await Promise.all([getStats(), getCategoryStats()]);
  return NextResponse.json({ stats, categories });
}
