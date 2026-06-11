import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("qoder");

const COMMAND_URL = "https://docs.qoder.com/en/cli/command";
const CLI_REFERENCE_URL = "https://docs.qoder.com/en/cli/reference";
const DOCS_HOME_URL = "https://docs.qoder.com/en/";

const config: ScraperConfig = {
  toolSlug: "qoder",
  toolName: "Qoder",
  sources: [
    { url: COMMAND_URL, type: "html", label: "CLI command reference" },
    { url: CLI_REFERENCE_URL, type: "html", label: "CLI reference" },
  ],
  slugify: (name: string) =>
    name
      .replace(/[​-‍﻿]/g, "")
      .replace(/^[-/]+/, "")
      .replace(/`/g, "")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/[|,].*$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._/@-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function cleanText(text: string): string {
  return text.replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
}

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("provider")) return "Model";
  if (t.includes("mcp") || t.includes("tool") || t.includes("plugin")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("wiki") || t.includes("field") || t.includes("frontmatter")) return "Config";
  if (t.includes("quest") || t.includes("task") || t.includes("action") || t.includes("agent")) return "Session";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("autonomous") || combined.includes("auto") || combined.includes("execute")) return "high";
  if (combined.includes("quest") || combined.includes("task") || combined.includes("mcp")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function commandTypeFor(name: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("--")) return "option";
  if (name.startsWith(".") || /^[a-zA-Z][\w-]*$/.test(name)) return "config";
  return "subcommand";
}

function tableSection($: ReturnType<typeof parseHtml>, table: any): string {
  let heading = $(table).prevAll("h2,h3,h4").first();
  if (!heading.length) heading = $(table).parent().prevAll("h2,h3,h4").first();
  return cleanText(heading.text()) || "Command";
}

function parseTables(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
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

      if (headers[0] === "Command") {
        const name = cells[0].split(",")[0].trim();
        const description = cells[cells.length - 1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: commandTypeFor(name),
          category: mapCategory(section + " " + name + " " + description),
          description,
          syntax: cells[0],
          notes: cells.length > 2 ? headers.slice(1).map((h, i) => `${h}: ${cells[i + 1]}`).filter(Boolean) : null,
          risk_level: inferRisk(name, description),
          source_url: sourceUrl,
        });
      }

      if (headers[0] === "Field") {
        const name = `command.${cells[0]}`;
        const description = cells[2] || cells[1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "config",
          category: "Config",
          description,
          syntax: `${cells[0]}: ${cells[1]}`,
          value_hint: cells[1],
          risk_level: inferRisk(name, description),
          source_url: sourceUrl,
        });
      }

      if (headers[0] === "Level") {
        const name = `${cells[0]} commands`;
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "config",
          category: "Config",
          description: `${cells[0]} custom command storage: ${cells[1]}. Scope: ${cells[2]}.`,
          syntax: cells[1],
          risk_level: "low",
          source_url: sourceUrl,
        });
      }
    }
  });
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  for (const source of config.sources) {
    log.info(`Fetching ${source.url}`);
    try {
      const html = await fetchHtml(source.url);
      parseTables(source.url, html, commands, seen);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  const known: ScrapedCommand[] = [
    { name: "Quest mode", slug: "quest-mode", command_type: "config", category: "Session", description: "Spec-driven autonomous coding mode. Delegate a full task via natural language; Qoder plans, codes, and verifies.", syntax: "Quest mode", risk_level: "medium", source_url: DOCS_HOME_URL },
    { name: "Repo Wiki", slug: "repo-wiki", command_type: "config", category: "Config", description: "Auto-generated codebase wiki. Qoder indexes the repo structure and generates searchable documentation.", syntax: "Repo Wiki", risk_level: "low", source_url: DOCS_HOME_URL },
    { name: "Action Flow", slug: "action-flow", command_type: "config", category: "Session", description: "Visual graph of all AI actions taken in a session. Review and replay individual steps.", syntax: "Action Flow", risk_level: "low", source_url: DOCS_HOME_URL },
    { name: "@file", slug: "at-file", command_type: "slash", category: "Session", description: "Reference a specific file as context in the current chat.", syntax: "@<filename>", risk_level: "low", source_url: DOCS_HOME_URL },
    { name: "@codebase", slug: "at-codebase", command_type: "slash", category: "Session", description: "Search and reason over the entire codebase using Repo Wiki.", syntax: "@codebase", risk_level: "low", source_url: DOCS_HOME_URL },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Connect MCP servers to extend Qoder with external tools and data sources.", syntax: "MCP server", risk_level: "medium", source_url: DOCS_HOME_URL },
    { name: ".qoder/rules", slug: "qoder-rules", command_type: "config", category: "Config", description: "Project rules directory. Define coding standards and instructions for Qoder sessions.", syntax: ".qoder/rules/", risk_level: "low", source_url: DOCS_HOME_URL },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Qoder`);
  return commands;
}
