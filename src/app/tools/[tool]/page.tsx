// src/app/tools/[tool]/page.tsx
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getToolBySlug, getCommandsByTool } from "@/lib/queries";
import { CatBadge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { CommandTableClient } from "./command-table-client";

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolSlug } = await params;
  const [tool, commands] = await Promise.all([
    getToolBySlug(toolSlug),
    getCommandsByTool(toolSlug),
  ]);
  if (!tool) notFound();

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      <Breadcrumb items={[
        { href: "/", i18nKey: "home" },
        { href: "/tools", i18nKey: "tools" },
        { label: tool.name },
      ]} />

      {/* Tool header */}
      <div className="pt-5 pb-6 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4 max-[700px]:flex-col">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[13px] font-bold flex-shrink-0"
              style={{ color: tool.color }}>
              {tool.avatar}
            </div>
            <div>
              <div className="text-[20px] font-bold tracking-[-0.02em] mb-1">{tool.name}</div>
              <div className="text-[13px] text-[var(--muted)] max-w-[520px] mb-[10px]">{tool.description}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <CatBadge label={`by ${tool.company}`} />
                <CatBadge label={`${tool.command_count} commands`} />
                <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium"
                  style={{ background: '#f0fdf4', color: '#15803d' }}>{tool.version}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {tool.github_url && (
              <a href={tool.github_url} target="_blank" rel="noopener"
                className="inline-flex items-center gap-[5px] text-[12px] font-medium text-[var(--fg)] no-underline px-3 py-[5px] border border-[var(--border)] rounded-[var(--r)] hover:bg-[var(--surface)] hover:border-[#a1a1aa] transition-all">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                GitHub
              </a>
            )}
            {tool.docs_url && (
              <a href={tool.docs_url} target="_blank" rel="noopener"
                className="inline-flex items-center text-[12px] font-medium text-white no-underline px-3 py-[5px] bg-[var(--fg)] border border-[var(--fg)] rounded-[var(--r)] hover:bg-[#27272a] transition-all">
                Official Docs ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Client command table with tabs + filters */}
      <CommandTableClient commands={commands} toolSlug={tool.slug} />
    </div>
  );
}
