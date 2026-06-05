import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gemini-cli");

const DOCS_BASE = "https://www.geminicli.com/docs";

const config: ScraperConfig = {
  toolSlug: "gemini-cli",
  toolName: "Gemini CLI",
  sources: [
    { url: `${DOCS_BASE}/cli/cli-reference/`, type: "html", label: "CLI reference" },
    { url: `${DOCS_BASE}/reference/commands/`, type: "html", label: "Slash commands" },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-\/]+/, "")
      .replace(/\s+.*$/, "")
      .replace(/\s+/g, "-")
      .toLowerCase(),
};

export { config };

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const existingSlugs = new Set<string>();

  // 1. CLI reference — ALL data is in tables, not headings
  try {
    log.info(`Fetching ${config.sources[0].url}`);
    const html = await fetchHtml(config.sources[0].url);
    const $ = parseHtml(html);

    $("table").each((_, table) => {
      const $table = $(table);
      const headers = $table
        .find("thead th")
        .map((__, th) => $(th).text().trim().toLowerCase())
        .get();

      if (headers.length < 2) return;

      // Table: Command | Description | Example (CLI commands)
      if (headers[0] === "command" && headers[1] === "description") {
        $table.find("tbody tr").each((__, row) => {
          const cells = $(row).find("td");
          if (cells.length < 2) return;
          const rawName = $(cells[0]).text().replace(/\s+/g, " ").trim();
          const desc = $(cells[1]).text().replace(/\s+/g, " ").trim();
          const example = cells.length > 2 ? $(cells[2]).text().trim() : null;
          if (!rawName || !desc) return;

          // Skip "See Extensions/MCP" reference rows
          if (desc.startsWith("See ")) return;

          const slug = deriveGeminiSlug(rawName);
          if (existingSlugs.has(slug)) return;
          existingSlugs.add(slug);

          const isSlash = rawName.startsWith("/");
          const isSubcmd = rawName.startsWith("gemini ") && !rawName.includes("-");

          commands.push({
            name: rawName,
            slug,
            command_type: isSlash ? "slash" : isSubcmd ? "subcommand" : "subcommand",
            category: inferCategory(rawName, desc),
            description: desc,
            syntax: rawName,
            value_hint: null,
            parameters: null,
            examples: example && !example.startsWith("See ") ? [{ label: "Usage", lang: "shell", code: example }] : null,
            notes: null,
            caveats: null,
            source_url: config.sources[0].url,
            risk_level: inferRisk(rawName, desc),
          });
        });
      }

      // Table: Option | Alias | Type | Default | Description (CLI options)
      if (headers[0] === "option" && headers.includes("description")) {
        $table.find("tbody tr").each((__, row) => {
          const cells = $(row).find("td");
          if (cells.length < 4) return;
          const option = $(cells[0]).text().trim();
          const alias = $(cells[1]).text().trim();
          const type = $(cells[2]).text().trim();
          const defaultVal = $(cells[3]).text().trim();
          const desc = $(cells[4])?.text().trim() || "";
          if (!option.startsWith("--")) return;

          const slug = config.slugify(option);
          if (existingSlugs.has(slug)) return;
          existingSlugs.add(slug);

          const hasValue = type !== "-" && type !== "boolean";
          const notes: string[] = [];
          if (alias && alias !== "-") notes.push(`Alias: ${alias}`);
          if (defaultVal && defaultVal !== "-") notes.push(`Default: ${defaultVal}`);

          commands.push({
            name: option,
            slug,
            command_type: hasValue ? "option" : "flag",
            category: inferCategory(option, desc),
            description: desc,
            syntax: `gemini ${option}${hasValue ? ` <${type}>` : ""}`,
            value_hint: hasValue ? type : null,
            parameters: null,
            examples: null,
            notes: notes.length > 0 ? notes : null,
            caveats: null,
            source_url: config.sources[0].url,
            risk_level: inferRisk(option, desc),
          });
        });
      }

      // Table: Alias | Resolves To | Description (model aliases)
      if (headers[0] === "alias" && headers.includes("resolves to")) {
        $table.find("tbody tr").each((__, row) => {
          const cells = $(row).find("td");
          if (cells.length < 3) return;
          const alias = $(cells[0]).text().trim();
          const resolves = $(cells[1]).text().trim();
          const desc = $(cells[2]).text().trim();
          if (!alias) return;

          const slug = `model-alias-${alias.toLowerCase()}`;
          if (existingSlugs.has(slug)) return;
          existingSlugs.add(slug);

          commands.push({
            name: `--model ${alias}`,
            slug,
            command_type: "option",
            category: "Model",
            description: `${desc} Resolves to: ${resolves}`,
            syntax: `gemini --model ${alias}`,
            value_hint: alias,
            parameters: null,
            examples: null,
            notes: [`Resolves to: ${resolves}`],
            caveats: null,
            source_url: config.sources[0].url,
            risk_level: "low",
          });
        });
      }
    });

    log.success(`CLI reference: ${commands.length} commands`);
  } catch (err: any) {
    log.error(`CLI reference failed: ${err.message}`);
  }

  // 2. Slash commands reference page — each command is an h3
  try {
    log.info(`Fetching ${config.sources[1].url}`);
    const html = await fetchHtml(config.sources[1].url);
    const $ = parseHtml(html);

    // Parse h3 headings for slash commands
    $("h3").each((_, el) => {
      const $el = $(el);
      const heading = $el.text().replace(/\s+/g, " ").trim();

      // Match heading patterns like "/about", "/agents", "/clear"
      const match = heading.match(/^\/([\w-]+)/);
      if (!match) return;

      const name = `/${match[1]}`;
      const slug = config.slugify(name);
      if (existingSlugs.has(slug)) return;

      const descParts: string[] = [];
      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3")) {
        if (sibling.is("p")) {
          descParts.push(sibling.text().replace(/\s+/g, " ").trim());
        }
        sibling = sibling.next();
      }

      const description = descParts.join(" ").trim();
      if (!description) return;

      existingSlugs.add(slug);
      commands.push({
        name,
        slug,
        command_type: "slash",
        category: inferCategory(name, description),
        description,
        syntax: name,
        value_hint: null,
        parameters: null,
        examples: null,
        notes: null,
        caveats: null,
        source_url: config.sources[1].url,
        risk_level: inferRisk(name, description),
      });
    });

    log.success(`Total: ${commands.length} commands`);
  } catch (err: any) {
    log.error(`Slash commands page failed: ${err.message}`);
  }

  return commands;
}

function deriveGeminiSlug(rawName: string): string {
  if (rawName.startsWith("/")) {
    return rawName.replace(/^\//, "").split(/\s+/)[0].toLowerCase();
  }
  // "gemini -p" → "prompt", "gemini -r" → "resume", etc.
  const aliasMap: Record<string, string> = {
    "gemini": "gemini-interactive",
    'gemini -p "query"': "prompt",
    'gemini "query"': "query-interactive",
    "cat file | gemini": "pipe-input",
    'gemini -i "query"': "prompt-interactive",
    'gemini -r "latest"': "resume-latest",
  };
  for (const [pattern, slug] of Object.entries(aliasMap)) {
    if (rawName.startsWith(pattern)) return slug;
  }
  const parts = rawName.replace(/"/g, "").split(/\s+/).filter(Boolean);
  return parts.slice(1).filter(p => !p.startsWith('"') && !p.startsWith("<")).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "") || rawName.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function inferCategory(name: string, desc: string): string {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("alias")) return "Model";
  if (lower.includes("mcp") || lower.includes("extension") || lower.includes("skill") || lower.includes("tool")) return "MCP";
  if (lower.includes("permission") || lower.includes("sandbox") || lower.includes("approval") || lower.includes("trust")) return "Permission";
  if (lower.includes("session") || lower.includes("resume") || lower.includes("clear") || lower.includes("compress") ||
      lower.includes("help") || lower.includes("quit") || lower.includes("compact") || lower.includes("copy")) return "Session";
  return "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("yolo") || lower.includes("dangerously")) return "high";
  if (lower.includes("sandbox") || lower.includes("approval") || lower.includes("skip-trust")) return "medium";
  return "low";
}
