// src/app/compare/page.tsx
export const dynamic = "force-dynamic";
import { getCompareData, getTools } from "@/lib/queries";
import { CompareClient } from "./compare-client";
import { CompareHeader } from "./compare-header";

export default async function ComparePage() {
  const [modelData, sessionData, permissionData, mcpData, configData, tools] = await Promise.all([
    getCompareData("model"),
    getCompareData("session"),
    getCompareData("permission"),
    getCompareData("mcp"),
    getCompareData("config"),
    getTools(),
  ]);

  const allData = {
    model: modelData,
    session: sessionData,
    permission: permissionData,
    mcp: mcpData,
    config: configData,
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6">
      <CompareHeader />
      <CompareClient allData={allData} tools={tools} />
    </div>
  );
}
