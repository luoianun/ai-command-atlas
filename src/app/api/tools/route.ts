// src/app/api/tools/route.ts
import { NextResponse } from "next/server";
import { getTools } from "@/lib/queries";

export async function GET() {
  const tools = await getTools();
  return NextResponse.json(tools);
}
