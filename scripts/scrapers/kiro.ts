import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("kiro");

const config: ScraperConfig = {
  toolSlug: "kiro",
  toolName: "Kiro",
  sources: [
    { url: "https://kiro.dev/docs/cli/reference/cli-commands/", type: "html", label: "CLI commands" },
    { url: "https://kiro.dev/docs/cli/reference/slash-commands/", type: "html", label: "Slash commands" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(heading: string): string {
  const h = heading.toLowerCase();
  if (h.includes("mcp")) return "MCP";
  if (h.includes("model")) return "Model";
  if (h.includes("config") || h.includes("setting") || h.includes("login") || h.includes("agent")) return "Config";
  if (h.includes("perm") || h.includes("trust") || h.includes("tool")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("trust-all") || combined.includes("dangerously")) return "high";
  if (combined.includes("no-interactive") || combined.includes("bypass")) return "medium";
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

      let currentSection = "General";

      $("main").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        const text = $el.text().trim();

        if (tag === "h2") {
          currentSection = text;
          return;
        }

        if (tag === "h3" || tag === "h4") {
          const codeEl = $el.find("code");
          const rawName = codeEl.length ? codeEl.first().text().trim() : text;
          if (!rawName || rawName.length < 2) return;

          const descParts: string[] = [];
          let sibling = $el.next();
          while (sibling.length && !sibling.is("h2, h3, h4")) {
            if (sibling.is("p")) {
              const t = sibling.text().replace(/\s+/g, " ").trim();
              if (t) descParts.push(t);
            }
            sibling = sibling.next();
          }
          const description = descParts.join(" ").trim() || `${rawName} command.`;
          const slug = config.slugify(rawName);

          if (!seen.has(slug)) {
            seen.add(slug);
            const isSlash = rawName.startsWith("/");
            const isFlag = rawName.startsWith("--") || rawName.startsWith("-");
            const commandType = isSlash ? "slash" : isFlag ? "option" : "subcommand";

            commands.push({
              name: rawName,
              slug,
              command_type: commandType,
              category: mapCategory(currentSection + " " + rawName),
              description,
              syntax: isSlash ? rawName : isFlag ? rawName : `kiro-cli ${rawName}`,
              risk_level: inferRisk(rawName, description),
              source_url: source.url,
            });
          }
        }
      });

      log.success(`Scraped from ${source.label}: ${commands.length} total`);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  return commands;
}
