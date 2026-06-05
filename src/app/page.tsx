// src/app/page.tsx
export const dynamic = "force-dynamic";
import { getRecentCommands, getStats, getCategoryStats, getTools } from "@/lib/queries";
import { HomeContent } from "./home-content";

export default async function HomePage() {
  const [commands, stats, categories, tools] = await Promise.all([
    getRecentCommands(10),
    getStats(),
    getCategoryStats(),
    getTools(),
  ]);

  return <HomeContent commands={commands} stats={stats} categories={categories} tools={tools} />;
}
