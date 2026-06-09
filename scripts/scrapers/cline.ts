import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("cline");

const config: ScraperConfig = {
  toolSlug: "cline",
  toolName: "Cline",
  sources: [
    { url: "https://docs.cline.bot/home", type: "html", label: "Docs home" },
    { url: "https://docs.cline.bot/features/slash-commands/deep-planning", type: "html", label: "Deep planning" },
    { url: "https://docs.cline.bot/features/slash-commands", type: "html", label: "Slash commands" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("mcp")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting")) return "Config";
  if (t.includes("perm") || t.includes("mode") || t.includes("plan") || t.includes("act")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("dangerously") || combined.includes("auto-approve")) return "high";
  if (combined.includes("act mode") || combined.includes("autonomous")) return "medium";
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

      $("main").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Only grab headings that look like commands
        const isSlash = text.startsWith("/");
        const isMode = /\b(mode|rules?)\b/i.test(text);
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
        const description = descParts.join(" ").trim() || `${text} command.`;
        const slug = config.slugify(text);

        if (!seen.has(slug)) {
          seen.add(slug);
          commands.push({
            name: text,
            slug,
            command_type: isSlash ? "slash" : "config",
            category: mapCategory(text),
            description,
            syntax: isSlash ? text : text,
            risk_level: inferRisk(text, description),
            source_url: source.url,
          });
        }
      });
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  log.success(`Scraped ${commands.length} commands from Cline`);
  return commands;
}
