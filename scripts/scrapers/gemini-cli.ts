import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchMarkdown } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gemini-cli");

const GITHUB_RAW = "https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/cli";

const config: ScraperConfig = {
  toolSlug: "gemini-cli",
  toolName: "Gemini CLI",
  sources: [
    { url: `${GITHUB_RAW}/cli-reference.md`, type: "markdown", label: "CLI reference (GitHub)" },
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

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  let md = "";
  try {
    log.info(`Fetching ${config.sources[0].url}`);
    md = await fetchMarkdown(config.sources[0].url);
    log.success(`Fetched ${md.length} chars`);
  } catch (err: any) {
    log.error(`Failed to fetch: ${err.message}`);
  }

  if (md) {
    const lines = md.split("\n");
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("## ")) {
        currentSection = line.replace(/^##\s+/, "");
        continue;
      }

      // Table header row
      if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
        const { headers, rows } = parseMarkdownTable(lines, i);

        // Table: Command | Description | Example
        if (headers[0] === "command" && headers[1] === "description") {
          for (const row of rows) {
            const rawName = row[0]?.replace(/\\/g, "") || "";
            const desc = row[1] || "";
            const example = row[2] || "";
            if (!rawName || !desc || desc.startsWith("See ")) continue;

            const slug = config.slugify(rawName);
            if (seen.has(slug)) continue;
            seen.add(slug);

            const isSlash = rawName.startsWith("/");
            commands.push({
              name: rawName,
              slug,
              command_type: isSlash ? "slash" : "subcommand",
              category: inferCategory(rawName, desc),
              description: desc,
              syntax: rawName,
              examples: example && !example.startsWith("See ") ? [{ label: "Usage", lang: "shell", code: example }] : null,
              source_url: config.sources[0].url,
              risk_level: inferRisk(rawName, desc),
            });
          }
        }

        // Table: Option | Alias | Type | Default | Description
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
            if (desc.includes("Deprecated")) notes.push("Deprecated");

            commands.push({
              name: option,
              slug,
              command_type: isFlag ? "flag" : "option",
              category: inferCategory(option, desc),
              description: desc,
              syntax: `gemini ${option}${!isFlag ? ` <${type}>` : ""}`,
              value_hint: !isFlag ? type : null,
              notes: notes.length > 0 ? notes : null,
              source_url: config.sources[0].url,
              risk_level: inferRisk(option, desc),
            });
          }
        }

        // Table: Alias | Resolves To | Description
        if (headers[0] === "alias" && headers.includes("resolves to")) {
          for (const row of rows) {
            const alias = row[0] || "";
            const resolves = row[1] || "";
            const desc = row[2] || "";
            if (!alias) continue;

            const slug = `model-alias-${alias.toLowerCase().replace(/\s+/g, "-")}`;
            if (seen.has(slug)) continue;
            seen.add(slug);

            commands.push({
              name: `--model ${alias}`,
              slug,
              command_type: "option",
              category: "Model",
              description: `${desc} Resolves to: ${resolves}`,
              syntax: `gemini --model ${alias}`,
              value_hint: alias,
              notes: [`Resolves to: ${resolves}`],
              source_url: config.sources[0].url,
              risk_level: "low",
            });
          }
        }

        // Table: Command | Description (interactive slash commands)
        if (headers[0] === "command" && headers[1] === "description" && currentSection.toLowerCase().includes("interactive")) {
          // Already handled above, but ensure slash commands get slash type
        }
      }
    }
  }

  // Fallback known commands if scrape is empty
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
