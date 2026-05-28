// src/app/compare/page.tsx
import { getCompareData, getTools } from "@/lib/queries";
import { CompareClient } from "./compare-client";

export default async function ComparePage() {
  // Fetch all 5 categories upfront — small dataset, no lazy loading needed
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
      {/* Page header */}
      <div className="py-8 pb-6 border-b border-[var(--border)]">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] mb-[6px]">
          Compare AI CLI Commands
        </h1>
        <p className="text-[13px] text-[var(--muted)]">
          Side-by-side comparison of equivalent capabilities across Claude Code, Codex CLI, Gemini
          CLI, Aider, and OpenCode.
        </p>
      </div>

      <CompareClient allData={allData} tools={tools} />
    </div>
  );
}
