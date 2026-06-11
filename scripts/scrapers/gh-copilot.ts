import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gh-copilot");

const CLI_REFERENCE_URL = "https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference";

const config: ScraperConfig = {
  toolSlug: "gh-copilot",
  toolName: "GitHub Copilot CLI",
  sources: [
    {
      url: CLI_REFERENCE_URL,
      type: "html",
      label: "CLI command reference",
    },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-/]+/, "")
      .replace(/`/g, "")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._/@#-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function mapCategory(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("mcp")) return "MCP";
  if (s.includes("model") || s.includes("provider")) return "Model";
  if (s.includes("permission") || s.includes("approval") || s.includes("security") || s.includes("tool availability")) return "Permission";
  if (s.includes("config") || s.includes("environment") || s.includes("hook") || s.includes("skill") || s.includes("agent") || s.includes("telemetry")) return "Config";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("always allow") || combined.includes("bypass") || combined.includes("execute") || combined.includes("shell")) return "high";
  if (combined.includes("permission") || combined.includes("mcp") || combined.includes("tool") || combined.includes("oauth")) return "medium";
  return "low";
}

function commandTypeFor(name: string, headers: string[], section: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("-") || /^[A-Z_][A-Z0-9_]+$/.test(name)) return name.includes(" ") || name.includes("HOST") ? "option" : "flag";
  if (headers[0] === "Shortcut") return "slash";
  if (headers[0] === "Variable" || headers[0] === "Field" || headers[0] === "Attribute" || headers[0] === "Key") return "config";
  if (section.toLowerCase().includes("settings") || section.toLowerCase().includes("locations") || section.toLowerCase().includes("limits")) return "config";
  return "subcommand";
}

function valueHintFromName(name: string): string | null {
  const match = name.match(/\b([A-Z][A-Z0-9_-]+)\b|(<[^>]+>|\[[^\]]+\])/);
  return match?.[0] || null;
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function tableSection($: ReturnType<typeof parseHtml>, table: any): string {
  let heading = $(table).prevAll("h2,h3,h4").first();
  if (!heading.length) heading = $(table).parent().prevAll("h2,h3,h4").first();
  return cleanText(heading.text()) || "CLI reference";
}

function parseTables(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);

  $("main table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    const headers = $(rows.shift() || [])
      .find("th,td")
      .map((__, cell) => cleanText($(cell).text()))
      .get();
    if (!headers.length) return;

    const section = tableSection($, table);
    for (const row of rows) {
      const cells = $(row).find("td").map((__, cell) => cleanText($(cell).text())).get();
      if (cells.length < 2) continue;

      const primary = cells[0];
      const description = cells[Math.min(cells.length - 1, headers.includes("Required") ? 2 : 1)] || cells[1];
      if (!primary || !description) continue;

      let name = primary.split(",")[0].trim();
      if (headers[0] === "Shortcut") name = `${section}: ${primary}`;
      if (headers[0] === "Field" || headers[0] === "Attribute" || headers[0] === "Key") name = `${section}.${primary}`;
      if (headers[0] === "Option" && section.toLowerCase().includes("mcp")) name = `copilot mcp ${primary}`;
      if (headers[0] === "Subcommand") name = `copilot mcp ${primary}`;

      addCommand(commands, seen, {
        name,
        slug: config.slugify(name),
        command_type: commandTypeFor(name, headers, section),
        category: mapCategory(section + " " + name + " " + description),
        description,
        syntax: primary,
        value_hint: valueHintFromName(primary),
        notes: cells.length > 2 ? headers.slice(1).map((h, i) => `${h}: ${cells[i + 1]}`).filter(Boolean) : null,
        risk_level: inferRisk(name, description),
        source_url: CLI_REFERENCE_URL,
      });
    }
  });
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  log.info(`Fetching ${CLI_REFERENCE_URL}`);
  try {
    const html = await fetchHtml(CLI_REFERENCE_URL);
    parseTables(html, commands, seen);
    log.success(`Scraped ${commands.length} commands from GitHub Copilot CLI`);
  } catch (err: any) {
    log.warn(`Fetch failed: ${err.message}`);
  }

  return commands;
}
