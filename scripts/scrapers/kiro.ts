import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("kiro");

const CLI_COMMANDS_URL = "https://kiro.dev/docs/cli/reference/cli-commands/";
const SLASH_COMMANDS_URL = "https://kiro.dev/docs/cli/reference/slash-commands/";

const config: ScraperConfig = {
  toolSlug: "kiro",
  toolName: "Kiro",
  sources: [
    { url: CLI_COMMANDS_URL, type: "html", label: "CLI commands" },
    { url: SLASH_COMMANDS_URL, type: "html", label: "Slash commands" },
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

function mapCategory(heading: string): string {
  const h = heading.toLowerCase();
  if (h.includes("mcp")) return "MCP";
  if (h.includes("model")) return "Model";
  if (h.includes("config") || h.includes("setting") || h.includes("login") || h.includes("agent") || h.includes("knowledge") || h.includes("hooks")) return "Config";
  if (h.includes("perm") || h.includes("trust") || h.includes("tool") || h.includes("checkpoint")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("trust-all") || combined.includes("trust all") || combined.includes("--hard") || combined.includes("potentially destructive") || combined.includes("api key")) return "high";
  if (combined.includes("no-interactive") || combined.includes("bypass") || combined.includes("mcp") || combined.includes("tools") || combined.includes("permission") || combined.includes("execute")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function commandTypeFor(name: string, section: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("--") || name.startsWith("-")) return name.includes("<") || name.includes(" ") ? "option" : "flag";
  if (/^[A-Z_][A-Z0-9_]+$/.test(name)) return "config";
  if (section.toLowerCase().includes("settings") || section.toLowerCase().includes("log files")) return "config";
  return "subcommand";
}

function valueHintFromName(name: string): string | null {
  const match = name.match(/(<[^>]+>|\[[^\]]+\]|\b[A-Z][A-Z0-9_-]+\b)/);
  return match?.[0] || null;
}

function parseCliTables(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "CLI reference";

  $("h2,h3,h4,table").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    if (tag !== "table") {
      const heading = cleanText($el.text());
      if (heading) currentSection = heading;
      return;
    }

    const rows = $el.find("tr").toArray();
    const headers = $(rows.shift() || [])
      .find("th,td")
      .map((__, cell) => cleanText($(cell).text()))
      .get();
    if (!headers.length) return;

    const section = currentSection;
    for (const row of rows) {
      const cells = $(row).find("td").map((__, cell) => cleanText($(cell).text())).get();
      if (cells.length < 2) continue;

      const firstHeader = headers[0];
      const primary = cells[0];
      const description = cells[cells.length - 1];
      if (!primary || !description) continue;

      let name = primary.split("/")[0].trim();
      if (firstHeader === "Subcommand") name = `${section} ${primary}`;
      if (section.startsWith("kiro-cli mcp") && firstHeader === "Argument") name = `${section} ${primary}`;

      addCommand(commands, seen, {
        name,
        slug: config.slugify(name),
        command_type: commandTypeFor(name, section),
        category: mapCategory(section + " " + name + " " + description),
        description,
        syntax: primary,
        value_hint: valueHintFromName(primary),
        notes: cells.length > 2 ? headers.slice(1).map((h, i) => `${h}: ${cells[i + 1]}`).filter(Boolean) : null,
        risk_level: inferRisk(name, description),
        source_url: sourceUrl,
      });
    }
  });
}

function parseHeadings(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "General";

  $("h2,h3,h4").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const text = cleanText($el.text());
    if (!text || text.length > 90 || text === "Next steps") return;

    if (tag === "h2") {
      currentSection = text;
      return;
    }

    const isSlash = text.startsWith("/");
    const isCommand = text.startsWith("kiro-cli ");
    const isConfig = /\b(agent|model|knowledge|tools|hooks|mcp|theme|settings|checkpoint|skill|keyboard|session|storage|log files)\b/i.test(text);
    if (!isSlash && !isCommand && !isConfig) return;

    const descParts: string[] = [];
    let sibling = $el.parent(".heading-anchor-wrapper").length ? $el.parent().next() : $el.next();
    while (sibling.length && !sibling.is("h1,h2,h3,h4,.heading-anchor-wrapper")) {
      if (sibling.is("p,li,span")) {
        const t = cleanText(sibling.text());
        if (t) descParts.push(t);
      }
      sibling = sibling.next();
    }

    const description = descParts.join(" ") || `${text} command.`;
    addCommand(commands, seen, {
      name: text,
      slug: config.slugify(text),
      command_type: commandTypeFor(text, currentSection),
      category: mapCategory(currentSection + " " + text + " " + description),
      description,
      syntax: text,
      risk_level: inferRisk(text, description),
      source_url: sourceUrl,
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
      parseCliTables(source.url, html, commands, seen);
      parseHeadings(source.url, html, commands, seen);
      log.success(`Scraped from ${source.label}: ${commands.length} total`);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  const known: ScrapedCommand[] = [
    { name: "kiro", slug: "kiro-start", command_type: "subcommand", category: "Session", description: "Start Kiro IDE or open a project. Entry point for the Kiro CLI.", syntax: "kiro [path]", risk_level: "low", source_url: "https://kiro.dev/docs/cli/" },
    { name: "--chat", slug: "chat", command_type: "flag", category: "Session", description: "Start Kiro in chat mode for interactive Q&A without a project context.", syntax: "kiro --chat", risk_level: "low", source_url: "https://kiro.dev/docs/cli/" },
    { name: "Spec-driven development", slug: "spec-driven", command_type: "config", category: "Session", description: "Define a spec file (.kiro/specs/) and let Kiro generate tasks, code, and tests.", syntax: ".kiro/specs/<feature>.md", risk_level: "medium", source_url: "https://kiro.dev/docs/specs/" },
    { name: "Hooks", slug: "hooks", command_type: "config", category: "Config", description: "Event-driven automation. Trigger AI tasks on file save, git commit, and other events.", syntax: ".kiro/hooks/", risk_level: "medium", source_url: "https://kiro.dev/docs/hooks/" },
    { name: "Steering rules", slug: "steering-rules", command_type: "config", category: "Config", description: "Persistent instructions injected into every Kiro session. Define coding style, architecture, and constraints.", syntax: ".kiro/steering/", risk_level: "low", source_url: "https://kiro.dev/docs/steering/" },
    { name: "Agent mode", slug: "agent-mode", command_type: "config", category: "Permission", description: "Fully autonomous mode. Kiro reads, writes, and executes to implement a spec end-to-end.", syntax: "Agent mode (IDE)", risk_level: "high", source_url: "https://kiro.dev/docs/agents/" },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Connect MCP servers to extend Kiro with external tools, APIs, and data sources.", syntax: "MCP server (.kiro/settings.json)", risk_level: "medium", source_url: "https://kiro.dev/docs/mcp/" },
    { name: "/new-spec", slug: "new-spec", command_type: "slash", category: "Session", description: "Create a new spec file for a feature. Kiro scaffolds requirements and task list.", syntax: "/new-spec", risk_level: "low", source_url: "https://kiro.dev/docs/specs/" },
    { name: "/implement", slug: "implement", command_type: "slash", category: "Session", description: "Implement the current spec. Kiro generates code for each task in the spec.", syntax: "/implement", risk_level: "medium", source_url: "https://kiro.dev/docs/specs/" },
    { name: "Model selection", slug: "model-selection", command_type: "config", category: "Model", description: "Choose the AI model for Kiro sessions (Claude Sonnet, Haiku, etc.).", syntax: "Model selection (IDE settings)", risk_level: "low", source_url: "https://kiro.dev/docs/models/" },
    { name: ".kiro/settings.json", slug: "kiro-settings", command_type: "config", category: "Config", description: "Project-level Kiro configuration: MCP servers, model, permissions, hooks.", syntax: ".kiro/settings.json", risk_level: "low", source_url: "https://kiro.dev/docs/cli/" },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Kiro`);
  return commands;
}
