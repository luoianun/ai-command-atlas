import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml, fetchMarkdown } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gemini-cli");

const config: ScraperConfig = {
  toolSlug: "gemini-cli",
  toolName: "Gemini CLI",
  sources: [
    { url: "https://geminicli.com/docs/reference/commands/", type: "html", label: "Commands reference" },
    { url: "https://geminicli.com/docs/cli/cli-reference/", type: "html", label: "CLI flags reference" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/`]+/, "").replace(/`/g, "").replace(/\s+.*$/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function inferCategory(name: string, desc: string): string {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("alias")) return "Model";
  if (lower.includes("mcp") || lower.includes("extension") || lower.includes("skill") || lower.includes("tool")) return "MCP";
  if (lower.includes("permission") || lower.includes("sandbox") || lower.includes("approval") || lower.includes("trust") || lower.includes("yolo")) return "Permission";
  if (lower.includes("session") || lower.includes("resume") || lower.includes("clear") || lower.includes("compress") ||
      lower.includes("help") || lower.includes("quit") || lower.includes("compact") || lower.includes("reload")) return "Session";
  return "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("yolo") || lower.includes("dangerously")) return "high";
  if (lower.includes("sandbox") || lower.includes("approval") || lower.includes("skip-trust") || lower.includes("auto_edit")) return "medium";
  return "low";
}

async function scrapeHtml(url: string, commands: ScrapedCommand[], seen: Set<string>): Promise<void> {
  const html = await fetchHtml(url);
  const $ = parseHtml(html);

  let currentSection = "General";

  // Parse tables first (Starlight CLI reference pages often use tables)
  $("main table, article table").each((_, table) => {
    const $table = $(table);
    const headers = $table.find("thead th, tr:first-child th")
      .map((__, th) => $(th).text().trim().toLowerCase().replace(/`/g, "")).get();

    if (!headers.length) return;

    const hasCommand = headers.some(h => h.includes("command") || h.includes("option") || h.includes("flag") || h.includes("name"));
    if (!hasCommand) return;

    const descIdx = headers.findIndex(h => h.includes("description") || h.includes("desc"));
    const nameIdx = 0;

    $table.find("tbody tr").each((__, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const rawName = $(cells[nameIdx]).text().replace(/\s+/g, " ").trim().replace(/`/g, "");
      const desc = descIdx >= 0 ? $(cells[descIdx]).text().replace(/\s+/g, " ").trim() : "";
      if (!rawName || rawName.length > 80) return;

      const slug = config.slugify(rawName);
      if (seen.has(slug)) return;
      seen.add(slug);

      const isSlash = rawName.startsWith("/");
      const isFlag = rawName.startsWith("--") || rawName.startsWith("-");

      commands.push({
        name: rawName,
        slug,
        command_type: isSlash ? "slash" : isFlag ? "option" : "subcommand",
        category: inferCategory(rawName, desc),
        description: desc || `${rawName} command.`,
        syntax: isFlag ? `gemini ${rawName}` : rawName,
        source_url: url,
        risk_level: inferRisk(rawName, desc),
      });
    });
  });

  // Parse headings (h2/h3/h4) for commands not in tables
  $("main, article").find("h2, h3, h4").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const text = $el.text().trim();

    if (tag === "h2") {
      currentSection = text;
      return;
    }

    if (!text || text.length > 80) return;

    const isSlash = text.startsWith("/");
    const isFlag = text.startsWith("--") || text.startsWith("-");
    const isCommand = /\b(mode|config|setting|mcp|model|session|sandbox|approval|yolo|help|clear|compress|resume|quit)\b/i.test(text);
    if (!isSlash && !isFlag && !isCommand) return;

    const descParts: string[] = [];
    let sibling = $el.next();
    while (sibling.length && !sibling.is("h1, h2, h3, h4")) {
      if (sibling.is("p")) {
        const t = sibling.text().replace(/\s+/g, " ").trim();
        if (t) descParts.push(t);
      }
      sibling = sibling.next();
    }
    const description = descParts.join(" ").trim() || `${text} command.`;
    const slug = config.slugify(text);

    if (seen.has(slug)) return;
    seen.add(slug);

    commands.push({
      name: text,
      slug,
      command_type: isSlash ? "slash" : isFlag ? "option" : "config",
      category: inferCategory(currentSection + " " + text, description),
      description,
      syntax: isFlag ? `gemini ${text}` : text,
      source_url: url,
      risk_level: inferRisk(text, description),
    });
  });
}

function parseMarkdownTable(lines: string[], startIdx: number): { headers: string[]; rows: string[][] } {
  const headers = lines[startIdx]
    .split("|")
    .map(h => h.trim().toLowerCase().replace(/`/g, ""))
    .filter(Boolean);

  const rows: string[][] = [];
  for (let i = startIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|")) break;
    const cells = line.split("|").map(c => c.trim().replace(/`/g, "")).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length > 0) rows.push(cells);
  }
  return { headers, rows };
}

async function scrapeGitHubMarkdown(commands: ScrapedCommand[], seen: Set<string>): Promise<void> {
  const GITHUB_RAW = "https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli/cli-reference.md";
  log.info(`Fallback: fetching ${GITHUB_RAW}`);
  const md = await fetchMarkdown(GITHUB_RAW);
  const lines = md.split("\n");
  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) { currentSection = line.replace(/^##\s+/, ""); continue; }

    if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const { headers, rows } = parseMarkdownTable(lines, i);

      if (headers[0] === "command" && headers[1] === "description") {
        for (const row of rows) {
          const rawName = row[0]?.replace(/\\/g, "") || "";
          const desc = row[1] || "";
          if (!rawName || !desc || desc.startsWith("See ")) continue;
          const slug = config.slugify(rawName);
          if (seen.has(slug)) continue;
          seen.add(slug);
          const isSlash = rawName.startsWith("/");
          commands.push({
            name: rawName, slug,
            command_type: isSlash ? "slash" : "subcommand",
            category: inferCategory(rawName, desc),
            description: desc, syntax: rawName,
            source_url: GITHUB_RAW, risk_level: inferRisk(rawName, desc),
          });
        }
      }

      if (headers[0] === "option" && headers.includes("description")) {
        const descIdx = headers.indexOf("description");
        const aliasIdx = headers.indexOf("alias");
        const typeIdx = headers.indexOf("type");
        const defaultIdx = headers.indexOf("default");
        for (const row of rows) {
          const option = row[0] || "";
          if (!option.startsWith("--") && !option.startsWith("-")) continue;
          const desc = row[descIdx] || "";
          const alias = aliasIdx >= 0 ? row[aliasIdx] || "" : "";
          const type = typeIdx >= 0 ? row[typeIdx] || "" : "";
          const defaultVal = defaultIdx >= 0 ? row[defaultIdx] || "" : "";
          const slug = config.slugify(option);
          if (seen.has(slug)) continue;
          seen.add(slug);
          const isFlag = type === "boolean" || type === "-" || !type;
          const notes: string[] = [];
          if (alias && alias !== "-") notes.push(`Alias: ${alias}`);
          if (defaultVal && defaultVal !== "-") notes.push(`Default: ${defaultVal}`);
          commands.push({
            name: option, slug,
            command_type: isFlag ? "flag" : "option",
            category: inferCategory(option, desc),
            description: desc,
            syntax: `gemini ${option}${!isFlag ? ` <${type}>` : ""}`,
            value_hint: !isFlag ? type : null,
            notes: notes.length > 0 ? notes : null,
            source_url: GITHUB_RAW, risk_level: inferRisk(option, desc),
          });
        }
      }
    }
  }
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  // Primary: geminicli.com HTML pages
  for (const source of config.sources) {
    log.info(`Fetching ${source.url}`);
    try {
      await scrapeHtml(source.url, commands, seen);
      log.success(`Scraped from ${source.label}: ${commands.length} total`);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Fallback: GitHub raw markdown if HTML sources returned nothing
  if (commands.length === 0) {
    try {
      await scrapeGitHubMarkdown(commands, seen);
    } catch (err: any) {
      log.warn(`GitHub markdown fallback failed: ${err.message}`);
    }
  }

  // Always-present known commands
  const known: ScrapedCommand[] = [
    { name: "--model", slug: "model", command_type: "option", category: "Model", description: "Select the Gemini model variant (e.g. gemini-2.5-pro, auto).", syntax: "gemini --model <model-id>", value_hint: "<model-id>", source_url: config.sources[0].url, risk_level: "low" },
    { name: "--prompt", slug: "prompt", command_type: "option", category: "Session", description: "Non-interactive prompt. Forces headless mode and exits when done.", syntax: 'gemini --prompt "<query>"', value_hint: "<query>", source_url: config.sources[0].url, risk_level: "low" },
    { name: "--sandbox", slug: "sandbox", command_type: "flag", category: "Permission", description: "Run in a sandboxed environment for safer code execution.", syntax: "gemini --sandbox", source_url: config.sources[0].url, risk_level: "medium" },
    { name: "--yolo", slug: "yolo", command_type: "flag", category: "Permission", description: "Auto-approve all tool actions without confirmation. Deprecated in favor of --approval-mode=yolo.", syntax: "gemini --yolo", source_url: config.sources[0].url, risk_level: "high" },
    { name: "--approval-mode", slug: "approval-mode", command_type: "option", category: "Permission", description: "Control tool approval: default, auto_edit, yolo, plan.", syntax: "gemini --approval-mode <mode>", value_hint: "default|auto_edit|yolo|plan", source_url: config.sources[0].url, risk_level: "medium" },
    { name: "--resume", slug: "resume", command_type: "option", category: "Session", description: "Resume a previous session by ID or 'latest'.", syntax: 'gemini --resume "latest"', value_hint: "<session-id|latest>", source_url: config.sources[0].url, risk_level: "low" },
    { name: "/compress", slug: "compress", command_type: "slash", category: "Session", description: "Compress conversation history to free up context window.", syntax: "/compress", source_url: config.sources[0].url, risk_level: "low" },
    { name: "/clear", slug: "clear", command_type: "slash", category: "Session", description: "Clear the current conversation history.", syntax: "/clear", source_url: config.sources[0].url, risk_level: "low" },
    { name: "/help", slug: "help", command_type: "slash", category: "Session", description: "Display available commands and usage information.", syntax: "/help", source_url: config.sources[0].url, risk_level: "low" },
    { name: "GEMINI.md", slug: "gemini-md", command_type: "config", category: "Config", description: "Custom instructions file loaded from project root, injected into every session.", syntax: "GEMINI.md", source_url: config.sources[0].url, risk_level: "low" },
    { name: "config", slug: "config", command_type: "subcommand", category: "Config", description: "View or edit Gemini CLI configuration stored in ~/.gemini/settings.json.", syntax: "gemini config", source_url: config.sources[0].url, risk_level: "low" },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Gemini CLI`);
  return commands;
}
