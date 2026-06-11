import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("qoder");

const config: ScraperConfig = {
  toolSlug: "qoder",
  toolName: "Qoder",
  sources: [
    { url: "https://docs.qoder.com/en/cli/command", type: "html", label: "CLI command reference" },
    { url: "https://docs.qoder.com/en/", type: "html", label: "Docs home" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("provider")) return "Model";
  if (t.includes("mcp") || t.includes("tool") || t.includes("plugin")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("wiki")) return "Config";
  if (t.includes("quest") || t.includes("task") || t.includes("action")) return "Session";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("quest") || combined.includes("autonomous") || combined.includes("auto")) return "medium";
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
      $("main, article, .content, [class*='content']").find("h1, h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        const text = $el.text().trim();
        if (!text || text.length > 100) return;

        if (tag === "h1" || tag === "h2") { currentSection = text; return; }

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
            command_type: text.startsWith("--") ? "option" : text.startsWith("/") ? "slash" : "subcommand",
            category: mapCategory(currentSection + " " + text),
            description,
            syntax: text.startsWith("--") ? text : text.startsWith("/") ? text : `qoder ${text.toLowerCase().replace(/\s+/g, "-")}`,
            risk_level: inferRisk(text, description),
            source_url: source.url,
          });
        }
      });

      // Also parse any tables (CLI reference often uses tables)
      $("table").each((_, table) => {
        const $table = $(table);
        const headers = $table.find("thead th, tr:first-child th, tr:first-child td")
          .map((__, th) => $(th).text().trim().toLowerCase()).get();
        if (!headers.some(h => h.includes("command") || h.includes("option") || h.includes("flag"))) return;

        $table.find("tbody tr, tr:not(:first-child)").each((__, row) => {
          const cells = $(row).find("td");
          if (cells.length < 2) return;
          const name = $(cells[0]).text().replace(/\s+/g, " ").trim();
          const desc = $(cells[1]).text().replace(/\s+/g, " ").trim();
          if (!name || !desc) return;

          const slug = config.slugify(name);
          if (seen.has(slug)) return;
          seen.add(slug);

          commands.push({
            name,
            slug,
            command_type: name.startsWith("--") ? "option" : "subcommand",
            category: mapCategory(name + " " + desc),
            description: desc,
            syntax: name,
            risk_level: inferRisk(name, desc),
            source_url: config.sources[0].url,
          });
        });
      });
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Qoder docs may be sparse/SPA — always ensure core commands present
  const known: ScrapedCommand[] = [
    { name: "Quest mode", slug: "quest-mode", command_type: "config", category: "Session", description: "Spec-driven autonomous coding mode. Delegate a full task via natural language; Qoder plans, codes, and verifies.", syntax: "Quest mode (IDE)", risk_level: "medium", source_url: "https://docs.qoder.com/en/cli/command" },
    { name: "--spec", slug: "quest-spec", command_type: "option", category: "Session", description: "Natural language specification for the Quest task to be autonomously completed.", syntax: '--spec "<task description>"', value_hint: "<description>", risk_level: "medium", source_url: "https://docs.qoder.com/en/cli/command" },
    { name: "Repo Wiki", slug: "repo-wiki", command_type: "config", category: "Config", description: "Auto-generated codebase wiki. Qoder indexes the repo structure and generates searchable documentation.", syntax: "Repo Wiki (IDE panel)", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
    { name: "Action Flow", slug: "action-flow", command_type: "config", category: "Session", description: "Visual graph of all AI actions taken in a session. Review and replay individual steps.", syntax: "Action Flow (IDE panel)", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
    { name: "@file", slug: "at-file", command_type: "slash", category: "Session", description: "Reference a specific file as context in the current chat.", syntax: "@<filename>", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
    { name: "@codebase", slug: "at-codebase", command_type: "slash", category: "Session", description: "Search and reason over the entire codebase using Repo Wiki.", syntax: "@codebase", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Connect MCP servers to extend Qoder with external tools and data sources.", syntax: "MCP server (IDE settings)", risk_level: "medium", source_url: "https://docs.qoder.com/en/" },
    { name: "Model selection", slug: "model-selection", command_type: "config", category: "Model", description: "Switch between AI models for completions and chat (Claude, GPT-4o, etc.).", syntax: "Model selection (IDE settings)", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
    { name: ".qoder/rules", slug: "qoder-rules", command_type: "config", category: "Config", description: "Project rules directory. Define coding standards and instructions for Qoder sessions.", syntax: ".qoder/rules/", risk_level: "low", source_url: "https://docs.qoder.com/en/" },
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
