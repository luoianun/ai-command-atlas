import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("opencode");

const config: ScraperConfig = {
  toolSlug: "opencode",
  toolName: "OpenCode",
  sources: [
    {
      url: "https://opencode.ai/docs/cli/",
      type: "html",
      label: "CLI usage",
    },
    {
      url: "https://opencode.ai/docs/tui/",
      type: "html",
      label: "TUI commands",
    },
    {
      url: "https://opencode.ai/docs/commands/",
      type: "html",
      label: "Commands",
    },
    {
      url: "https://opencode.ai/docs/config/",
      type: "html",
      label: "Configuration",
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
  const existingSlugs = new Set<string>();

  for (const source of config.sources) {
    try {
      log.info(`Fetching ${source.url}`);
      const html = await fetchHtml(source.url);
      const $ = parseHtml(html);

      let currentCategory = source.label === "Configuration" ? "Config" : "Session";
      let inCommandsSection = false;

      $("main h2, main h3, main h4").each((_, el) => {
        const $el = $(el);
        const tag = el.tagName?.toLowerCase() ?? (el as any).name?.toLowerCase();
        const text = $el.text().replace(/\s+/g, " ").trim();

        if (tag === "h2") {
          if (text.toLowerCase().includes("model")) currentCategory = "Model";
          else if (text.toLowerCase().includes("mcp")) currentCategory = "MCP";
          else if (text.toLowerCase().includes("config")) currentCategory = "Config";
          else if (text.toLowerCase().includes("provider")) currentCategory = "Model";
          inCommandsSection = text.toLowerCase() === "commands";
          return;
        }

        const codeEl = $el.find("code");
        const rawName = codeEl.length ? codeEl.first().text().trim() : text;

        // TUI page: bare h3 headings under "Commands" section (e.g. "connect", "compact")
        if (source.label === "TUI commands" && inCommandsSection && tag === "h3") {
          const cmdName = text.toLowerCase().trim();
          if (!cmdName || cmdName === "options" || cmdName === "attention") return;

          const slug = cmdName;
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

          commands.push({
            name: `/${cmdName}`,
            slug,
            command_type: "slash",
            category: "Session",
            description,
            syntax: `/${cmdName}`,
            value_hint: null,
            parameters: null,
            examples: null,
            notes: null,
            caveats: null,
            source_url: source.url,
            risk_level: "low",
          });
          existingSlugs.add(slug);
          return;
        }

        if (!rawName.startsWith("--") && !rawName.startsWith("/")) return;

        const parts = rawName.split(/\s+/);
        const flagName = parts[0];
        const slug = config.slugify(flagName);
        if (existingSlugs.has(slug)) return;

        const valueHint = parts.length > 1 ? parts.slice(1).join(" ") : null;

        const descParts: string[] = [];
        let sibling = $el.next();
        while (sibling.length && !sibling.is("h2, h3, h4")) {
          const t = sibling.text().trim();
          if (t && !t.startsWith("```")) descParts.push(t);
          sibling = sibling.next();
        }

        const description = descParts.join(" ").trim();
        if (!description) return;

        const isSlash = flagName.startsWith("/");

        commands.push({
          name: flagName,
          slug,
          command_type: isSlash ? "slash" : valueHint ? "option" : "flag",
          category: isSlash ? "Session" : currentCategory,
          description,
          syntax: isSlash ? flagName : `opencode ${rawName}`,
          value_hint: valueHint,
          parameters: null,
          examples: null,
          notes: null,
          caveats: null,
          source_url: source.url,
          risk_level: "low",
        });
        existingSlugs.add(slug);
      });

      // Check tables
      $("main table tbody tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;
        const name = $(cells[0]).text().trim();
        const desc = $(cells[1]).text().trim();
        if (!name.startsWith("/") && !name.startsWith("--")) return;

        const slug = config.slugify(name);
        if (existingSlugs.has(slug)) return;

        const isSlash = name.startsWith("/");

        commands.push({
          name,
          slug,
          command_type: isSlash ? "slash" : "option",
          category: isSlash ? "Session" : currentCategory,
          description: desc,
          syntax: name,
          value_hint: null,
          parameters: null,
          examples: null,
          notes: null,
          caveats: null,
          source_url: source.url,
          risk_level: "low",
        });
        existingSlugs.add(slug);
      });

      log.success(
        `${source.label}: ${commands.length} commands total so far`
      );
    } catch (err: any) {
      log.error(`${source.label} failed: ${err.message}`);
    }
  }

  log.success(`Total: ${commands.length} commands`);
  return commands;
}
