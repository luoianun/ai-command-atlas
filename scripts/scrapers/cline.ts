import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("cline");

const CLI_REFERENCE_URL = "https://docs.cline.bot/cli/cli-reference";
const USING_COMMANDS_URL = "https://docs.cline.bot/core-workflows/using-commands";
const PLAN_AND_ACT_URL = "https://docs.cline.bot/core-workflows/plan-and-act";
const CLINE_RULES_URL = "https://docs.cline.bot/customization/cline-rules";
const CLINEIGNORE_URL = "https://docs.cline.bot/customization/clineignore";
const API_OVERVIEW_URL = "https://docs.cline.bot/api/overview";

const config: ScraperConfig = {
  toolSlug: "cline",
  toolName: "Cline",
  sources: [
    { url: CLI_REFERENCE_URL, type: "html", label: "CLI reference" },
    { url: USING_COMMANDS_URL, type: "html", label: "Using commands" },
    { url: PLAN_AND_ACT_URL, type: "html", label: "Plan and Act" },
    { url: CLINE_RULES_URL, type: "html", label: "Cline rules" },
    { url: CLINEIGNORE_URL, type: "html", label: "Cline ignore" },
    { url: API_OVERVIEW_URL, type: "html", label: "API overview" },
  ],
  slugify: (name: string) =>
    name
      .replace(/[​-‍﻿]/g, "")
      .replace(/^[-/]+/, "")
      .replace(/`/g, "")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
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
  if (t.includes("mcp")) return "MCP";
  if (t.includes("model") || t.includes("provider") || t.includes("api") || t.includes("auth")) return "Model";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("memory") || t.includes("env") || t.includes("json")) return "Config";
  if (t.includes("perm") || t.includes("mode") || t.includes("plan") || t.includes("act") || t.includes("auto") || t.includes("sandbox")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("deny") || combined.includes("auto-approve") || combined.includes("api key")) return "high";
  if (combined.includes("execute") || combined.includes("shell") || combined.includes("command") || combined.includes("act mode") || combined.includes("auto")) return "medium";
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
  return aliases.find((part) => part.startsWith("--")) || aliases[0] || cleaned;
}

function primaryNameFromSyntax(syntax: string): string {
  return cleanText(syntax)
    .split("\n")[0]
    .replace(/#.*/, "")
    .trim();
}

function valueHintFromName(name: string): string | null {
  const match = name.match(/(<[^>]+>|\[[^\]]+\])/);
  return match?.[1] || null;
}

function commandTypeForName(name: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("-") || /^[A-Z_][A-Z0-9_]+$/.test(name)) return name.startsWith("--") && !name.includes("<") ? "flag" : "option";
  return "subcommand";
}

function parseCliReference(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);

  $("main table").each((index, table) => {
    const rows = $(table).find("tr").toArray();
    const headers = $(rows.shift() || [])
      .find("th,td")
      .map((_, cell) => cleanText($(cell).text()))
      .get();
    if (!headers.length) return;

    for (const row of rows) {
      const cells = $(row).find("td").map((_, cell) => cleanText($(cell).text())).get();
      if (cells.length < 2) continue;

      if (headers[0] === "Option") {
        const name = firstCommandName(cells[0]);
        const description = cells[1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: commandTypeForName(name),
          category: index === 1 ? "Plugin" : mapCategory(name + " " + description),
          description,
          syntax: cells[0],
          value_hint: valueHintFromName(cells[0]),
          source_url: CLI_REFERENCE_URL,
          risk_level: inferRisk(name, description),
        });
      }

      if (headers[0] === "Variable") {
        const name = cells[0];
        const description = cells[1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "config",
          category: mapCategory(name + " " + description),
          description,
          syntax: `env ${name}`,
          source_url: CLI_REFERENCE_URL,
          risk_level: inferRisk(name, description),
        });
      }

      if (headers[0] === "Field") {
        const name = index === 3 ? `CLINE_COMMAND_PERMISSIONS.${cells[0]}` : `json.${cells[0]}`;
        const description = cells[2] || cells[1];
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "config",
          category: index === 3 ? "Permission" : "Config",
          description,
          syntax: `${name}: ${cells[1]}`,
          value_hint: cells[1],
          source_url: CLI_REFERENCE_URL,
          risk_level: inferRisk(name, description),
        });
      }
    }
  });

  $("main .mdx-content").first().children("h3").each((_, heading) => {
    const title = cleanText($(heading).text());
    if (!title || title === "CLINE_COMMAND_PERMISSIONS") return;

    const descParts: string[] = [];
    const examples: { label: string; lang: string; code: string }[] = [];
    let sibling = $(heading).next();
    while (sibling.length && !sibling.is("h1,h2,h3")) {
      if (sibling.is("p,span")) {
        const text = cleanText(sibling.text());
        if (text) descParts.push(text);
      }
      if (sibling.text().includes("cline")) {
        const code = sibling.text().split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
        if (code) examples.push({ label: title, lang: "shell", code });
      }
      sibling = sibling.next();
    }

    const name = primaryNameFromSyntax(title);
    const description = descParts.join(" ") || `${name} command.`;
    addCommand(commands, seen, {
      name,
      slug: config.slugify(name),
      command_type: "subcommand",
      category: mapCategory(title + " " + description),
      description,
      syntax: `cline ${title}`,
      examples: examples.length ? examples : null,
      source_url: CLI_REFERENCE_URL,
      risk_level: inferRisk(name, description),
    });
  });

  addCommand(commands, seen, {
    name: "Configuration files",
    slug: "configuration-files",
    command_type: "config",
    category: "Config",
    description: "Cline stores providers, rules, skills, teams, sessions, checkpoints, tasks, logs, and settings under ~/.cline/data.",
    syntax: "~/.cline/data/",
    source_url: CLI_REFERENCE_URL,
    risk_level: "low",
  });
}

function parseFeaturePage(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "General";

  $("main, article, .mdx-content").find("h2, h3, h4").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const text = cleanText($el.text());
    if (!text || text.length > 90 || text === "On this page") return;

    if (tag === "h2") {
      currentSection = text;
      return;
    }

    const isSlash = text.startsWith("/");
    const isFlag = text.startsWith("-");
    const isNamedFeature = /\b(mode|rules?|memory|plan|checkpoint|mcp|api|provider|model|diff|task|ignore|command)\b/i.test(text);
    if (!isSlash && !isFlag && !isNamedFeature) return;

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
      category: mapCategory(currentSection + " " + text),
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
      if (source.url === CLI_REFERENCE_URL) {
        parseCliReference(html, commands, seen);
      } else {
        parseFeaturePage(source.url, html, commands, seen);
      }
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  const known: ScrapedCommand[] = [
    { name: "Plan mode", slug: "plan-mode", command_type: "config", category: "Permission", description: "Cline thinks and plans before acting. Review the proposed steps before execution begins.", syntax: "Plan mode", risk_level: "low", source_url: PLAN_AND_ACT_URL },
    { name: "Act mode", slug: "act-mode", command_type: "config", category: "Permission", description: "Cline autonomously executes file edits, terminal commands, and browser actions.", syntax: "Act mode", risk_level: "medium", source_url: PLAN_AND_ACT_URL },
    { name: "/newrule", slug: "newrule", command_type: "slash", category: "Config", description: "Create a new project or global rule file to guide Cline's behavior.", syntax: "/newrule", risk_level: "low", source_url: USING_COMMANDS_URL },
    { name: "/smol", slug: "smol", command_type: "slash", category: "Session", description: "Compact mode strips verbose output and condenses the response.", syntax: "/smol", risk_level: "low", source_url: USING_COMMANDS_URL },
    { name: ".clinerules", slug: "clinerules", command_type: "config", category: "Config", description: "Project-level rules file injected into every Cline session for the workspace.", syntax: ".clinerules", risk_level: "low", source_url: CLINE_RULES_URL },
    { name: ".clineignore", slug: "clineignore", command_type: "config", category: "Config", description: "Gitignore-style file specifying which files Cline cannot read or edit.", syntax: ".clineignore", risk_level: "low", source_url: CLINEIGNORE_URL },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Add external MCP servers to extend Cline with custom tools, APIs, and data sources.", syntax: "MCP server", risk_level: "medium", source_url: "https://docs.cline.bot/mcp/mcp-overview" },
    { name: "Auto-approve", slug: "auto-approve", command_type: "config", category: "Permission", description: "Skip confirmation for specific action types including reads, writes, terminal execution, browser actions, and MCP calls.", syntax: "Auto-approve", risk_level: "high", source_url: CLI_REFERENCE_URL },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Cline`);
  return commands;
}
