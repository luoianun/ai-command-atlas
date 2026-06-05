// src/app/commands/[tool]/[command]/page.tsx
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getCommandBySlug, getSimilarCommands } from "@/lib/queries";
import { CommandDetailClient } from "./command-detail-client";

export default async function CommandPage({
  params,
}: {
  params: Promise<{ tool: string; command: string }>;
}) {
  const { tool: toolSlug, command: commandSlug } = await params;
  const cmd = await getCommandBySlug(toolSlug, commandSlug);
  if (!cmd) notFound();

  const similar = await getSimilarCommands(cmd.name, cmd.tool_id);

  return <CommandDetailClient cmd={cmd} similar={similar} />;
}
