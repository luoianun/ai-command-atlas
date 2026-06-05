import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("aider");

const config: ScraperConfig = {
  toolSlug: "aider",
  toolName: "Aider",
  sources: [
    {
      url: "https://aider.chat/docs/config/options.html",
      type: "html",
      label: "Options reference",
    },
    {
      url: "https://aider.chat/docs/usage/commands.html",
      type: "html",
      label: "In-chat commands",
    },
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

  // 1. Scrape CLI options
  log.info(`Fetching ${config.sources[0].url}`);
  const optionsHtml = await fetchHtml(config.sources[0].url);
  const $opts = parseHtml(optionsHtml);

  let currentCategory = "General";

  $opts("#main-content h2, #main-content h3").each((_, el) => {
    const $el = $opts(el);
    const tag = el.tagName?.toLowerCase() ?? (el as any).name?.toLowerCase();

    if (tag === "h2") {
      const text = $el.text().replace(/\s+/g, " ").trim();
      currentCategory = text.replace(/:$/, "").trim();
      return;
    }

    if (tag === "h3") {
      const codeEl = $el.find("code");
      if (!codeEl.length) return;

      const rawName = codeEl.text().trim();
      if (!rawName.startsWith("--")) return;

      const parts = rawName.split(/\s+/);
      const flagName = parts[0];
      const valueHint = parts.length > 1 ? parts.slice(1).join(" ") : null;

      // Get description: all <p> siblings until next h2/h3
      const descParts: string[] = [];
      let envVar: string | null = null;
      let defaultVal: string | null = null;

      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3")) {
        if (sibling.is("p")) {
          const text = sibling.text().replace(/\s+/g, " ").trim();
          if (text) {
            const envMatch = text.match(
              /Environment variable:\s*(\S+)/
            );
            if (envMatch) {
              envVar = envMatch[1];
              const descPart = text
                .replace(/Environment variable:\s*\S+/, "")
                .trim();
              if (descPart) descParts.push(descPart);
            } else {
              const defMatch = text.match(/Default:\s*(.+)/);
              if (defMatch) {
                defaultVal = defMatch[1].trim();
              } else {
                descParts.push(text);
              }
            }
          }
        }
        sibling = sibling.next();
      }

      const description = descParts.join(" ").trim();
      if (!description) return;

      const hasValue = valueHint !== null;
      const commandType = hasValue ? "option" : "flag";
      const slug = config.slugify(flagName);

      const notes: string[] = [];
      if (envVar) notes.push(`Environment variable: ${envVar}`);
      if (defaultVal) notes.push(`Default: ${defaultVal}`);

      commands.push({
        name: flagName,
        slug,
        command_type: commandType,
        category: mapCategory(currentCategory),
        description,
        syntax: `aider ${rawName}`,
        value_hint: valueHint,
        parameters: null,
        examples: null,
        notes: notes.length > 0 ? notes : null,
        caveats: null,
        source_url: `https://aider.chat/docs/config/options.html#${$el.attr("id") || ""}`,
        risk_level: inferRisk(flagName, description),
      });
    }
  });

  log.success(`Scraped ${commands.length} CLI options`);

  // 2. Scrape slash commands
  log.info(`Fetching ${config.sources[1].url}`);
  const cmdsHtml = await fetchHtml(config.sources[1].url);
  const $cmds = parseHtml(cmdsHtml);

  $cmds("#main-content table tbody tr").each((_, row) => {
    const $row = $cmds(row);
    const cells = $row.find("td");
    if (cells.length < 2) return;

    const name = $cmds(cells[0]).text().trim();
    const desc = $cmds(cells[1]).text().trim();
    if (!name.startsWith("/")) return;

    const slug = config.slugify(name);

    commands.push({
      name,
      slug,
      command_type: "slash",
      category: "Session",
      description: desc,
      syntax: name,
      value_hint: null,
      parameters: null,
      examples: null,
      notes: null,
      caveats: null,
      source_url: "https://aider.chat/docs/usage/commands.html",
      risk_level: "low",
    });
  });

  log.success(
    `Total: ${commands.length} commands (options + slash commands)`
  );
  return commands;
}

function mapCategory(raw: string): string {
  const map: Record<string, string> = {
    "Main model": "Model",
    "API Keys and settings": "Config",
    "Model settings": "Model",
    "Cache settings": "Config",
    "Repomap settings": "Config",
    "History Files": "Session",
    "Output settings": "Config",
    "Git settings": "Config",
    "Fixing and committing": "Config",
    "Analytics": "Config",
    "Upgrading": "Config",
    Modes: "Session",
    "Voice settings": "Config",
    "Other settings": "Config",
  };
  return map[raw] || "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (
    lower.includes("dangerously") ||
    lower.includes("skip-sanity") ||
    lower.includes("auto-approve")
  )
    return "high";
  if (
    lower.includes("auto-commit") ||
    lower.includes("full-auto") ||
    lower.includes("--yes")
  )
    return "medium";
  return "low";
}
