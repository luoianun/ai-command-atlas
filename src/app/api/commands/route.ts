import { NextRequest, NextResponse } from "next/server";
import { getAllCommands } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const results = await getAllCommands({
    category: sp.get("category") ?? undefined,
    tool: sp.get("tool") ?? undefined,
    risk: sp.get("risk") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  return NextResponse.json(results);
}
