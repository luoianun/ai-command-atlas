import { NextRequest, NextResponse } from "next/server";
import { suggestCommands } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const tool = req.nextUrl.searchParams.get("tool") ?? undefined;
  if (q.length < 1) return NextResponse.json([]);
  const results = await suggestCommands(q, tool);
  return NextResponse.json(results);
}
