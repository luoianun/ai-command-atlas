import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("goose");

const config: ScraperConfig = {
  toolSlug: "goose",
  toolName: "Goose",
  sources: [
    { url: "https://block.github.io/goose/docs/guides/goose-cli-commands/", type: "html", label: "CLI commands" },
    { url: "https://block.github.io/goose/docs/guides/quick-tips/", type: "html", label: "Slash commands / tips" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("session") || s.includes("resume") || s.includes("history")) return "Session";
  if (s.includes("config") || s.includes("recipe") || s.includes("hints")) return "Config";
  if (s.includes("perm") || s.includes("mode") || s.includes("approv")) return "Permission";
  if (s.includes("mcp") || s.includes("extension")) return "MCP";
  if (s.includes("model") || s.includes("provider")) return "Model";
  return "General";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("dangerously") || combined.includes("auto-approve") || combined.includes("full-auto")) return "high";
  if (combined.includes("approve") || combined.includes("permission") || combined.includes("trust")) return "medium";
  return "low";
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];

  // 1. CLI commands page
  log.info(`Fetching ${config.sources[0].url}`);
  try {
    const html = await fetchHtml(config.sources[0].url);
    const $ = parseHtml(html);

    let currentSection = "General";

    $("main").find("h2, h3, h4").each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName || (el as any).name || "").toLowerCase();
      const text = $el.text().trim();

      if (tag === "h2" || tag === "h3") {
        currentSection = text;
        return;
      }

      if (tag === "h4") {
        // Extract command name from code element or heading text
        const codeEl = $el.find("code");
        const rawName = codeEl.length ? codeEl.first().text().trim() : text;
        if (!rawName) return;

        // Collect description from subsequent <p> elements
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
        const category = mapCategory(currentSection);
        const commandType = rawName.startsWith("/") ? "slash"
          : rawName.startsWith("--") ? "option"
          : "subcommand";

        commands.push({
          name: rawName,
          slug,
          command_type: commandType,
          category,
          description,
          syntax: rawName.startsWith("goose") ? rawName : rawName.startsWith("/") ? rawName : `goose ${rawName}`,
          risk_level: inferRisk(rawName, description),
          source_url: config.sources[0].url,
        });
      }
    });

    log.success(`Scraped ${commands.length} CLI commands from Goose`);
  } catch (err: any) {
    log.warn(`CLI page failed: ${err.message}`);
  }

  // 2. Slash commands from quick-tips page
  log.info(`Fetching ${config.sources[1].url}`);
  try {
    const html = await fetchHtml(config.sources[1].url);
    const $ = parseHtml(html);

    $("main").find("h3, h4").each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (!text.startsWith("/")) return;

      const descParts: string[] = [];
      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3, h4")) {
        if (sibling.is("p")) {
          const t = sibling.text().replace(/\s+/g, " ").trim();
          if (t) descParts.push(t);
        }
        sibling = sibling.next();
      }
      const description = descParts.join(" ").trim() || `${text} slash command.`;
      const slug = config.slugify(text);

      if (!commands.find(c => c.slug === slug)) {
        commands.push({
          name: text,
          slug,
          command_type: "slash",
          category: "Session",
          description,
          syntax: text,
          risk_level: inferRisk(text, description),
          source_url: config.sources[1].url,
        });
      }
    });
  } catch (err: any) {
    log.warn(`Slash commands page failed: ${err.message}`);
  }

  return commands;
}
