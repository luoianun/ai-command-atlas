import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("qoder");

const config: ScraperConfig = {
  toolSlug: "qoder",
  toolName: "Qoder",
  sources: [
    { url: "https://docs.qoder.com/", type: "html", label: "Qoder docs home" },
    { url: "https://qoder.com/en/blog/quest-mode", type: "html", label: "Quest mode" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

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
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        if (tag === "h2" || tag === "h3") return; // only h4 for commands

        const text = $el.text().trim();
        if (!text || text.length > 80) return;

        const descParts: string[] = [];
        let sibling = $el.next();
        while (sibling.length && !sibling.is("h2, h3, h4")) {
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
            command_type: text.startsWith("--") ? "option" : "subcommand",
            category: "Session",
            description,
            syntax: text.startsWith("qoder") ? text : text.startsWith("--") ? text : `qoder ${text.toLowerCase().replace(/\s+/g, "-")}`,
            risk_level: text.toLowerCase().includes("quest") ? "medium" : "low",
            source_url: source.url,
          });
        }
      });
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Qoder docs may be sparse/SPA — always return at least the known commands
  const known: ScrapedCommand[] = [
    {
      name: "quest",
      slug: "quest",
      command_type: "subcommand",
      category: "Session",
      description: "Quest mode: delegate a spec-driven coding task. Qoder autonomously plans, codes, and verifies the implementation.",
      syntax: 'qoder quest --spec "<description>"',
      risk_level: "medium",
      source_url: "https://qoder.com/en/blog/quest-mode",
    },
    {
      name: "--spec",
      slug: "quest-spec",
      command_type: "option",
      category: "Session",
      description: "Natural language specification for the Quest task to be completed.",
      syntax: '--spec "<task description>"',
      value_hint: "<description>",
      risk_level: "medium",
      source_url: "https://qoder.com/en/blog/quest-mode",
    },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Qoder`);
  return commands;
}
