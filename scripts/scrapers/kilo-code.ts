import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("kilo-code");

const CLI_URL = "https://kilo.ai/docs/code-with-ai/platforms/cli";
const CLI_REFERENCE_URL = "https://kilo.ai/docs/code-with-ai/platforms/cli-reference";
const MODEL_SELECTION_URL = "https://kilo.ai/docs/code-with-ai/agents/model-selection";
const MCP_URL = "https://kilo.ai/docs/automate/mcp/using-in-kilo-code";

const config: ScraperConfig = {
  toolSlug: "kilo-code",
  toolName: "Kilo Code",
  sources: [
    { url: CLI_URL, type: "html", label: "CLI guide" },
    { url: CLI_REFERENCE_URL, type: "html", label: "CLI command reference" },
    { url: MODEL_SELECTION_URL, type: "html", label: "Model selection" },
    { url: MCP_URL, type: "html", label: "MCP usage" },
  ],
  slugify: (name: string) =>
    name
      .replace(/[​-‍﻿]/g, "")
      .replace(/^[-/]+/, "")
      .replace(/`/g, "")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/[|,].*$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function cleanText(text: string): string {
  return text.replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
}

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("gateway") || t.includes("provider") || t.includes("auth")) return "Model";
  if (t.includes("mcp") || t.includes("tool")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("json") || t.includes("env")) return "Config";
  if (t.includes("perm") || t.includes("trust") || t.includes("approv") || t.includes("auto") || t.includes("remote")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("auto-approval") || combined.includes("api key") || combined.includes("external directories")) return "high";
  if (combined.includes("run") || combined.includes("remote") || combined.includes("mcp") || combined.includes("autonomous") || combined.includes("command")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function firstCommandName(value: string): string {
  const cleaned = cleanText(value);
  const aliases = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  return aliases[0] || cleaned;
}

function commandTypeForName(name: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("--")) return name.includes("<") ? "option" : "flag";
  if (/^[A-Z_][A-Z0-9_]+$/.test(name)) return "config";
  return "subcommand";
}

function valueHintFromName(name: string): string | null {
  const match = name.match(/(<[^>]+>|\[[^\]]+\])/);
  return match?.[1] || null;
}

function parseTableSection($: ReturnType<typeof parseHtml>, table: any): string {
  let heading = $(table).prevAll("h2,h3,h4").first();
  if (!heading.length) heading = $(table).parent().prevAll("h2,h3,h4").first();
  return cleanText(heading.text()) || "CLI Reference";
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

    const section = parseTableSection($, table);
    for (const row of rows) {
      const cells = $(row).find("td").map((__, cell) => cleanText($(cell).text())).get();
      if (cells.length < 2) continue;

      if (headers[0] === "Command") {
        const name = firstCommandName(cells[0]);
        const aliases = headers.includes("Aliases") ? cells[1] : "";
        const description = headers.includes("Aliases") ? cells[2] : cells[1];
        const notes = aliases && aliases !== "-" ? [`Aliases: ${aliases}`] : null;
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: commandTypeForName(name),
          category: mapCategory(section + " " + name + " " + description),
          description,
          syntax: cells[0],
          notes,
          source_url: sourceUrl,
          risk_level: inferRisk(name, description),
        });
      }

      if (headers[0] === "Flag") {
        const name = firstCommandName(cells[0]);
        const description = cells[1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: commandTypeForName(name),
          category: mapCategory(section + " " + name + " " + description),
          description,
          syntax: cells[0],
          value_hint: valueHintFromName(cells[0]),
          source_url: sourceUrl,
          risk_level: inferRisk(name, description),
        });
      }

      if (headers[0] === "Scope") {
        const name = `${cells[0]} config file`;
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "config",
          category: "Config",
          description: `Kilo ${cells[0].toLowerCase()} configuration file location: ${cells[1]}`,
          syntax: cells[1],
          source_url: sourceUrl,
          risk_level: "low",
        });
      }
    }
  });
}

function parseFeatureHeadings(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "General";

  $("main, article").find("h2, h3, h4").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const text = cleanText($el.text());
    if (!text || text.length > 90 || text === "On this page") return;

    if (tag === "h2") {
      currentSection = text;
      return;
    }

    const isSlash = text.startsWith("/");
    const isFlag = text.startsWith("--");
    const isMode = /\b(mode|gateway|rules?|mcp|server|plan|debug|architect|ask|orches|remote|permission|config|environment)\b/i.test(text);
    if (!isSlash && !isFlag && !isMode) return;

    const descParts: string[] = [];
    let sibling = $el.next();
    while (sibling.length && !sibling.is("h1,h2,h3,h4")) {
      if (sibling.is("p,span,li")) {
        const t = cleanText(sibling.text());
        if (t) descParts.push(t);
      }
      sibling = sibling.next();
    }

    const description = descParts.join(" ") || `${text} feature.`;
    addCommand(commands, seen, {
      name: text,
      slug: config.slugify(text),
      command_type: isSlash ? "slash" : isFlag ? commandTypeForName(text) : "config",
      category: mapCategory(currentSection + " " + text + " " + description),
      description,
      syntax: text,
      source_url: sourceUrl,
      risk_level: inferRisk(text, description),
    });
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
      parseFeatureHeadings(source.url, html, commands, seen);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  const known: ScrapedCommand[] = [
    { name: "Code mode", slug: "code-mode", command_type: "config", category: "Session", description: "Primary autonomous coding mode. Kilo reads, writes, and executes to implement features end-to-end.", syntax: "Code mode", risk_level: "medium", source_url: CLI_URL },
    { name: "Architect mode", slug: "architect-mode", command_type: "config", category: "Session", description: "High-level planning and architecture design mode. Focuses on structure without writing code.", syntax: "Architect mode", risk_level: "low", source_url: CLI_URL },
    { name: "Debug mode", slug: "debug-mode", command_type: "config", category: "Session", description: "Specialized debugging mode. Analyzes errors, traces root causes, and suggests targeted fixes.", syntax: "Debug mode", risk_level: "low", source_url: CLI_URL },
    { name: "Ask mode", slug: "ask-mode", command_type: "config", category: "Session", description: "Read-only Q&A mode. Kilo answers questions about the codebase without making any changes.", syntax: "Ask mode", risk_level: "low", source_url: CLI_URL },
    { name: "Orchestrator mode", slug: "orchestrator-mode", command_type: "config", category: "Session", description: "Multi-agent orchestration mode. Spawns sub-agents to parallelize complex tasks.", syntax: "Orchestrator mode", risk_level: "high", source_url: CLI_URL },
    { name: "Auto-approval settings", slug: "auto-approval-settings", command_type: "config", category: "Permission", description: "Configure which Kilo actions can run without confirmation in interactive or autonomous mode.", syntax: "auto-approval configuration", risk_level: "high", source_url: CLI_URL },
    { name: "KILO_API_KEY", slug: "kilo_api_key", command_type: "config", category: "Model", description: "Environment variable override for the Kilo API key.", syntax: "env KILO_API_KEY", risk_level: "high", source_url: CLI_URL },
    { name: "KILO_PROVIDER", slug: "kilo_provider", command_type: "config", category: "Model", description: "Environment variable override for the active provider.", syntax: "env KILO_PROVIDER", risk_level: "low", source_url: CLI_URL },
    { name: "KILOCODE_MODEL", slug: "kilocode_model", command_type: "config", category: "Model", description: "Environment variable override for the active Kilo model.", syntax: "env KILOCODE_MODEL", risk_level: "low", source_url: CLI_URL },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Kilo Code`);
  return commands;
}
