import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("kiro");

const config: ScraperConfig = {
  toolSlug: "kiro",
  toolName: "Kiro",
  sources: [
    { url: "https://kiro.dev/docs/cli/reference/cli-commands/", type: "html", label: "CLI commands" },
    { url: "https://kiro.dev/docs/cli/reference/slash-commands/", type: "html", label: "Slash commands" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(heading: string): string {
  const h = heading.toLowerCase();
  if (h.includes("mcp")) return "MCP";
  if (h.includes("model")) return "Model";
  if (h.includes("config") || h.includes("setting") || h.includes("login") || h.includes("agent")) return "Config";
  if (h.includes("perm") || h.includes("trust") || h.includes("tool")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("trust-all") || combined.includes("dangerously")) return "high";
  if (combined.includes("no-interactive") || combined.includes("bypass")) return "medium";
  return "low";
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  for (const source of config.sources) {
    log.info(`Fetching ${source.url}`);
    try {
      const html = await fetchHtml(source.url);
      const $ = parseHtml(html);

      let currentSection = "General";

      $("main").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        const text = $el.text().trim();

        if (tag === "h2") {
          currentSection = text;
          return;
        }

        if (tag === "h3" || tag === "h4") {
          const codeEl = $el.find("code");
          const rawName = codeEl.length ? codeEl.first().text().trim() : text;
          if (!rawName || rawName.length < 2) return;

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

          if (!seen.has(slug)) {
            seen.add(slug);
            const isSlash = rawName.startsWith("/");
            const isFlag = rawName.startsWith("--") || rawName.startsWith("-");
            const commandType = isSlash ? "slash" : isFlag ? "option" : "subcommand";

            commands.push({
              name: rawName,
              slug,
              command_type: commandType,
              category: mapCategory(currentSection + " " + rawName),
              description,
              syntax: isSlash ? rawName : isFlag ? rawName : `kiro-cli ${rawName}`,
              risk_level: inferRisk(rawName, description),
              source_url: source.url,
            });
          }
        }
      });

      log.success(`Scraped from ${source.label}: ${commands.length} total`);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Kiro docs may return empty — ensure core commands always present
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

  const seenSlugs = new Set(commands.map(c => c.slug));
  for (const k of known) {
    if (!seenSlugs.has(k.slug)) commands.push(k);
  }

  return commands;
}
