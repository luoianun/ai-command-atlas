import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("trae");

const config: ScraperConfig = {
  toolSlug: "trae",
  toolName: "Trae",
  sources: [
    { url: "https://docs.trae.ai/", type: "html", label: "Trae docs home" },
    { url: "https://docs.trae.ai/ide/builder-mode", type: "html", label: "Builder mode" },
    { url: "https://docs.trae.ai/ide/chat-panel", type: "html", label: "Chat panel" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/#]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("provider")) return "Model";
  if (t.includes("mcp") || t.includes("tool")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting")) return "Config";
  if (t.includes("builder") || t.includes("implement") || t.includes("plan")) return "Session";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("implement") || combined.includes("builder")) return "medium";
  return "low";
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  for (const source of config.sources) {
    log.info(`Fetching ${source.url}`);
    try {
      const html = await fetchHtml(source.url);
      const $ = parseHtml(html);

      $("main, article, .content").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        if (!text || text.length > 80) return;

        const isSlash = text.startsWith("/") || text.startsWith("#");
        const isMode = /\b(mode|panel|chat|builder|inline|cue)\b/i.test(text);
        if (!isSlash && !isMode) return;

        const descParts: string[] = [];
        let sibling = $el.next();
        while (sibling.length && !sibling.is("h1, h2, h3, h4")) {
          if (sibling.is("p")) {
            const t = sibling.text().replace(/\s+/g, " ").trim();
            if (t) descParts.push(t);
          }
          sibling = sibling.next();
        }
        const description = descParts.join(" ").trim() || `${text} feature.`;
        const slug = config.slugify(text);

        if (!seen.has(slug)) {
          seen.add(slug);
          commands.push({
            name: text,
            slug,
            command_type: isSlash ? "slash" : "config",
            category: mapCategory(text),
            description,
            syntax: text,
            risk_level: inferRisk(text, description),
            source_url: source.url,
          });
        }
      });
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Ensure known commands exist even if docs are SPA
  const known: ScrapedCommand[] = [
    {
      name: "Builder mode",
      slug: "builder-mode",
      command_type: "config",
      category: "Session",
      description: "Generate a full project from a natural language description. Trae shows a change preview before applying.",
      syntax: "Builder mode (IDE)",
      risk_level: "medium",
      source_url: "https://docs.trae.ai/ide/builder-mode",
    },
    {
      name: "Chat mode",
      slug: "chat-mode",
      command_type: "config",
      category: "Session",
      description: "Side chat panel for code Q&A, explanations, and targeted code edits.",
      syntax: "Chat mode (IDE)",
      risk_level: "low",
      source_url: "https://docs.trae.ai/ide/chat-panel",
    },
    {
      name: ".trae/rules/",
      slug: "project-rules",
      command_type: "config",
      category: "Config",
      description: "Project rules directory. Markdown files guide AI behavior for the project.",
      syntax: ".trae/rules/project_rules.md",
      risk_level: "low",
      source_url: "https://docs.trae.ai/",
    },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Trae`);
  return commands;
}
