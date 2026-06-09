import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gh-copilot");

const config: ScraperConfig = {
  toolSlug: "gh-copilot",
  toolName: "GitHub Copilot CLI",
  sources: [
    {
      url: "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference",
      type: "html",
      label: "CLI command reference",
    },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("suggest") || s.includes("explain")) return "Session";
  if (s.includes("config") || s.includes("alias") || s.includes("completion")) return "Config";
  if (s.includes("flag") || s.includes("option") || s.includes("target")) return "Session";
  return "General";
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  log.info(`Fetching ${config.sources[0].url}`);
  try {
    const html = await fetchHtml(config.sources[0].url);
    const $ = parseHtml(html);

    let currentSection = "General";

    $("main, article").find("h2, h3").each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName || (el as any).name || "").toLowerCase();
      const text = $el.text().trim();

      if (tag === "h2") {
        currentSection = text;
        return;
      }

      if (tag === "h3") {
        const codeEl = $el.find("code");
        const rawName = codeEl.length ? codeEl.first().text().trim() : text;
        if (!rawName || rawName.length < 2) return;

        const descParts: string[] = [];
        let sibling = $el.next();
        while (sibling.length && !sibling.is("h2, h3")) {
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
          const isFlag = rawName.startsWith("--") || rawName.startsWith("-");
          commands.push({
            name: rawName,
            slug,
            command_type: isFlag ? "option" : "subcommand",
            category: mapCategory(currentSection + " " + rawName),
            description,
            syntax: isFlag ? `gh copilot suggest ${rawName}` : `gh copilot ${rawName}`,
            risk_level: "low",
            source_url: config.sources[0].url,
          });
        }
      }
    });

    log.success(`Scraped ${commands.length} commands from GitHub Copilot CLI`);
  } catch (err: any) {
    log.warn(`Fetch failed: ${err.message}`);
  }

  return commands;
}
