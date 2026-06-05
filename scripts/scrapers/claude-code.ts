import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchWithPlaywright, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("claude-code");

const DOCS_BASE = "https://code.claude.com/docs/en";

const config: ScraperConfig = {
  toolSlug: "claude-code",
  toolName: "Claude Code",
  sources: [
    {
      url: `${DOCS_BASE}/cli-reference`,
      type: "html",
      label: "CLI reference (Playwright)",
    },
    {
      url: `${DOCS_BASE}/commands`,
      type: "html",
      label: "Slash commands (Playwright)",
    },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-\/]+/, "")
      .replace(/\s+/g, "-")
      .toLowerCase(),
};

export { config };

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const existingSlugs = new Set<string>();

  log.info("Launching Playwright to render CLI reference page...");
  const html = await fetchWithPlaywright(
    config.sources[0].url,
    "table"
  );
  const $ = parseHtml(html);

  const tables = $("table");
  log.info(`Found ${tables.length} tables on page`);

  tables.each((tableIdx, table) => {
    const $table = $(table);
    const headers = $table
      .find("th")
      .map((_, th) => $(th).text().trim().toLowerCase())
      .get();

    const hasCommand = headers.includes("command");
    const hasFlag = headers.includes("flag");

    if (!hasCommand && !hasFlag) return;

    $table.find("tbody tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const rawName = $(cells[0]).text().trim();
      const description = $(cells[1]).text().trim();
      const example = cells.length > 2 ? $(cells[2]).text().trim() : null;

      if (!rawName || !description) return;

      // Parse the command/flag name
      let name: string;
      let commandType: "option" | "slash" | "subcommand" | "flag" | "config";
      let slug: string;
      let syntax: string | null = null;

      if (hasCommand) {
        // CLI commands table: entries like "claude", "claude -p", "claude mcp", etc.
        name = rawName;
        slug = deriveSlug(rawName);
        commandType = deriveCommandType(rawName);
        syntax = rawName;
      } else {
        // CLI flags table: entries like "--model", "--permission-mode", etc.
        name = rawName.split(/\s+/)[0];
        slug = config.slugify(name);
        const hasValue = rawName.includes(" ") || description.toLowerCase().includes("specify") || description.toLowerCase().includes("set ");
        commandType = hasValue ? "option" : "flag";
        syntax = `claude ${rawName}`;
      }

      if (existingSlugs.has(slug)) return;
      existingSlugs.add(slug);

      const examples = example
        ? [{ label: "Usage", lang: "shell", code: example }]
        : null;

      commands.push({
        name,
        slug,
        command_type: commandType,
        category: inferCategory(name, description),
        description,
        syntax,
        value_hint: null,
        parameters: null,
        examples,
        notes: null,
        caveats: null,
        source_url: `${DOCS_BASE}/cli-reference`,
        risk_level: inferRisk(name, description),
      });
    });
  });

  log.success(`CLI reference: ${commands.length} commands`);

  // 2. Slash commands page — table with Command, Purpose
  try {
    log.info("Fetching slash commands page with Playwright...");
    const slashHtml = await fetchWithPlaywright(config.sources[1].url, "table");
    const $s = parseHtml(slashHtml);

    $s("table").each((_, table) => {
      const $table = $s(table);
      const headers = $table
        .find("th")
        .map((__, th) => $s(th).text().trim().toLowerCase())
        .get();

      if (!headers.includes("command") || !headers.includes("purpose")) return;

      $table.find("tbody tr, tr:not(:first-child)").each((__, row) => {
        const cells = $s(row).find("td");
        if (cells.length < 2) return;

        const rawCmd = $s(cells[0]).text().replace(/\s+/g, " ").trim();
        const purpose = $s(cells[1]).text().replace(/\s+/g, " ").trim();
        if (!rawCmd.startsWith("/")) return;

        const name = rawCmd.split(/\s+/)[0];
        const slug = config.slugify(name);
        if (existingSlugs.has(slug)) return;
        existingSlugs.add(slug);

        commands.push({
          name: rawCmd,
          slug,
          command_type: "slash",
          category: inferCategory(name, purpose),
          description: purpose,
          syntax: rawCmd,
          value_hint: null,
          parameters: null,
          examples: null,
          notes: null,
          caveats: null,
          source_url: `${DOCS_BASE}/commands`,
          risk_level: inferRisk(name, purpose),
        });
      });
    });

    log.success(`Total after slash commands: ${commands.length}`);
  } catch (err: any) {
    log.error(`Slash commands page failed: ${err.message}`);
  }

  return commands;
}

function deriveSlug(rawName: string): string {
  // "claude" → "claude" (skip, too generic)
  // "claude -p" → "print" (known alias)
  // "claude -c" → "continue" (known alias)
  // "claude mcp" → "mcp"
  // "claude auth login" → "auth-login"
  // "claude update" → "update"

  const aliasMap: Record<string, string> = {
    "claude -p": "print",
    'claude -p "query"': "print",
    "claude -c": "continue",
    'claude -c -p "query"': "continue-print",
    "claude -r": "resume",
  };

  for (const [pattern, slug] of Object.entries(aliasMap)) {
    if (rawName.startsWith(pattern)) return slug;
  }

  const parts = rawName.replace(/"/g, "").split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return "claude-interactive";

  // Remove "claude" prefix and join remaining
  return parts
    .slice(1)
    .filter((p) => !p.startsWith('"') && !p.startsWith("-") && !p.startsWith("<") && !p.startsWith("["))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function deriveCommandType(
  rawName: string
): "option" | "slash" | "subcommand" | "flag" | "config" {
  if (rawName.includes("-p") || rawName.includes("-c") || rawName.includes("-r"))
    return "flag";
  const parts = rawName.split(/\s+/);
  if (parts.length > 1 && !parts[1].startsWith("-") && !parts[1].startsWith('"'))
    return "subcommand";
  return "subcommand";
}

function inferCategory(name: string, desc: string): string {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("effort")) return "Model";
  if (
    lower.includes("permission") ||
    lower.includes("dangerously") ||
    lower.includes("allow")
  )
    return "Permission";
  if (lower.includes("mcp") || lower.includes("plugin")) return "MCP";
  if (
    lower.includes("session") ||
    lower.includes("resume") ||
    lower.includes("continue") ||
    lower.includes("compact") ||
    lower.includes("clear") ||
    lower.includes("help") ||
    lower.includes("attach")
  )
    return "Session";
  if (lower.includes("auth") || lower.includes("login")) return "Config";
  return "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("dangerously") || lower.includes("skip-permissions") || lower.includes("bypass"))
    return "high";
  if (lower.includes("permission") || lower.includes("auto-mode")) return "medium";
  return "low";
}
