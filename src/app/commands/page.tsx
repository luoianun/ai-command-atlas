export const dynamic = "force-dynamic";
import { getAllCommands, getTools, getCategoryStats } from "@/lib/queries";
import { CommandsClient } from "./commands-client";

export default async function CommandsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const [commands, tools, categories] = await Promise.all([
    getAllCommands({
      category: sp.category,
      tool: sp.tool,
      risk: sp.risk,
      q: sp.q,
    }),
    getTools(),
    getCategoryStats(),
  ]);

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      <CommandsClient
        initialCommands={commands}
        tools={tools}
        categories={categories.map(c => c.category)}
        initialFilters={{
          category: sp.category ?? "",
          tool: sp.tool ?? "",
          risk: sp.risk ?? "",
          q: sp.q ?? "",
        }}
      />
    </div>
  );
}
