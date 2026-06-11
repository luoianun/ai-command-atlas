import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("goose");

const config: ScraperConfig = {
  toolSlug: "goose",
  toolName: "Goose",
  sources: [
    { url: "https://goose-docs.ai/docs/guides/goose-cli-commands/", type: "html", label: "CLI commands" },
    { url: "https://goose-docs.ai/docs/guides/quick-tips/", type: "html", label: "Slash commands / tips" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("session") || s.includes("resume") || s.includes("history")) return "Session";
  if (s.includes("config") || s.includes("recipe") || s.includes("hints")) return "Config";
  if (s.includes("perm") || s.includes("mode") || s.includes("approv")) return "Permission";
  if (s.includes("mcp") || s.includes("extension")) return "MCP";
  if (s.includes("model") || s.includes("provider")) return "Model";
  return "General";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("dangerously") || combined.includes("auto-approve") || combined.includes("full-auto")) return "high";
  if (combined.includes("approve") || combined.includes("permission") || combined.includes("trust")) return "medium";
  return "low";
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];

  // 1. CLI commands page
  log.info(`Fetching ${config.sources[0].url}`);
  try {
    const html = await fetchHtml(config.sources[0].url);
    const $ = parseHtml(html);

    let currentSection = "General";

    $("main").find("h2, h3, h4").each((_, el) => {
      const $el = $(el);
      const tag = (el.tagName || (el as any).name || "").toLowerCase();
      const text = $el.text().trim();

      if (tag === "h2" || tag === "h3") {
        currentSection = text;
        return;
      }

      if (tag === "h4") {
        // Extract command name from code element or heading text
        const codeEl = $el.find("code");
        const rawName = codeEl.length ? codeEl.first().text().trim() : text;
        if (!rawName) return;

        // Collect description from subsequent <p> elements
        const descParts: string[] = [];
        let sibling = $el.next();
        while (sibling.length && !sibling.is("h2, h3, h4")) {
          if (sibling.is("p")) {
            const t = sibling.text().replace(/\s+/g, " ").trim();
            if (t) descParts.push(t);
          }
          sibling = sibling.next();
        }
        const description = descParts.join(" ").trim() || `${rawName} command.`;

        const slug = config.slugify(rawName);
        const category = mapCategory(currentSection);
        const commandType = rawName.startsWith("/") ? "slash"
          : rawName.startsWith("--") ? "option"
          : "subcommand";

        commands.push({
          name: rawName,
          slug,
          command_type: commandType,
          category,
          description,
          syntax: rawName.startsWith("goose") ? rawName : rawName.startsWith("/") ? rawName : `goose ${rawName}`,
          risk_level: inferRisk(rawName, description),
          source_url: config.sources[0].url,
        });
      }
    });

    log.success(`Scraped ${commands.length} CLI commands from Goose`);
  } catch (err: any) {
    log.warn(`CLI page failed: ${err.message}`);
  }

  // 2. Slash commands from quick-tips page
  log.info(`Fetching ${config.sources[1].url}`);
  try {
    const html = await fetchHtml(config.sources[1].url);
    const $ = parseHtml(html);

    $("main").find("h3, h4").each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (!text.startsWith("/")) return;

      const descParts: string[] = [];
      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3, h4")) {
        if (sibling.is("p")) {
          const t = sibling.text().replace(/\s+/g, " ").trim();
          if (t) descParts.push(t);
        }
        sibling = sibling.next();
      }
      const description = descParts.join(" ").trim() || `${text} slash command.`;
      const slug = config.slugify(text);

      if (!commands.find(c => c.slug === slug)) {
        commands.push({
          name: text,
          slug,
          command_type: "slash",
          category: "Session",
          description,
          syntax: text,
          risk_level: inferRisk(text, description),
          source_url: config.sources[1].url,
        });
      }
    });
  } catch (err: any) {
    log.warn(`Slash commands page failed: ${err.message}`);
  }

  // Fallback known commands if pages are unreachable
  const known: ScrapedCommand[] = [
    { name: "goose run", slug: "run", command_type: "subcommand", category: "Session", description: "Start a new Goose session in the current directory.", syntax: "goose run", risk_level: "medium", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "goose session", slug: "session", command_type: "subcommand", category: "Session", description: "Manage Goose sessions: list, resume, or delete.", syntax: "goose session [list|resume|delete]", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "goose configure", slug: "configure", command_type: "subcommand", category: "Config", description: "Interactive configuration wizard for providers, models, and extensions.", syntax: "goose configure", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "goose info", slug: "info", command_type: "subcommand", category: "Config", description: "Display current Goose configuration and environment information.", syntax: "goose info", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "--provider", slug: "provider", command_type: "option", category: "Model", description: "Select the AI provider (openai, anthropic, google, ollama, etc.).", syntax: "goose --provider <provider>", value_hint: "<provider>", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "--model", slug: "model", command_type: "option", category: "Model", description: "Specify the model to use for the session.", syntax: "goose --model <model-id>", value_hint: "<model-id>", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
    { name: "/exit", slug: "exit", command_type: "slash", category: "Session", description: "Exit the current Goose session.", syntax: "/exit", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/quick-tips/" },
    { name: "/clear", slug: "clear", command_type: "slash", category: "Session", description: "Clear the conversation history.", syntax: "/clear", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/quick-tips/" },
    { name: "goose mcp", slug: "mcp", command_type: "subcommand", category: "MCP", description: "Manage MCP (Model Context Protocol) servers and extensions.", syntax: "goose mcp", risk_level: "low", source_url: "https://goose-docs.ai/docs/guides/goose-cli-commands/" },
  ];

  const seenSlugs = new Set(commands.map(c => c.slug));
  for (const k of known) {
    if (!seenSlugs.has(k.slug)) commands.push(k);
  }

  return commands;
}
