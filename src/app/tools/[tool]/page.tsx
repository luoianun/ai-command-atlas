// src/app/tools/[tool]/page.tsx
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getToolBySlug, getCommandsByTool } from "@/lib/queries";
import { Breadcrumb } from "@/components/breadcrumb";
import { CommandTableClient } from "./command-table-client";
import { ToolHeader } from "./tool-header";

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
        <ToolHeader tool={tool} />
      </div>

      {/* Client command table with tabs + filters */}
      <CommandTableClient commands={commands} toolSlug={tool.slug} />
    </div>
  );
}
