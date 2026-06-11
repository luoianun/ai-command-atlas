import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("kilo-code");

const config: ScraperConfig = {
  toolSlug: "kilo-code",
  toolName: "Kilo Code",
  sources: [
    { url: "https://kilo.ai/docs/code-with-ai/platforms/cli", type: "html", label: "CLI reference" },
    { url: "https://kilo.ai/docs/code-with-ai/agent-modes", type: "html", label: "Agent modes" },
    { url: "https://kilo.ai/docs/code-with-ai/slash-commands", type: "html", label: "Slash commands" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("gateway") || t.includes("provider")) return "Model";
  if (t.includes("mcp") || t.includes("tool")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting")) return "Config";
  if (t.includes("perm") || t.includes("trust") || t.includes("approv")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("dangerously") || combined.includes("auto-approve")) return "high";
  if (combined.includes("code mode") || combined.includes("autonomous") || combined.includes("act")) return "medium";
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

      $("main, article").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        const text = $el.text().trim();

        if (tag === "h2") {
          currentSection = text;
          return;
        }

        if (tag === "h3" || tag === "h4") {
          if (!text || text.length > 80) return;

          const isSlash = text.startsWith("/");
          const isFlag = text.startsWith("--");
          const isMode = /\b(mode|gateway|rules?|mcp|server|plan|debug|architect|ask|orches)\b/i.test(text);
          if (!isSlash && !isFlag && !isMode) return;

          const descParts: string[] = [];
          let sibling = $el.next();
          while (sibling.length && !sibling.is("h1, h2, h3, h4")) {
            if (sibling.is("p")) {
              const t = sibling.text().replace(/\s+/g, " ").trim();
              if (t) descParts.push(t);
            }
            sibling = sibling.next();
          }
          const description = descParts.join(" ").trim() || `${text} feature.`;
          const slug = config.slugify(text);

          if (!seen.has(slug)) {
            seen.add(slug);
            commands.push({
              name: text,
              slug,
              command_type: isSlash ? "slash" : isFlag ? "option" : "config",
              category: mapCategory(currentSection + " " + text),
              description,
              syntax: isSlash ? text : isFlag ? text : text,
              risk_level: inferRisk(text, description),
              source_url: source.url,
            });
          }
        }
      });
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  // Comprehensive known commands as fallback
  const known: ScrapedCommand[] = [
    { name: "Code mode", slug: "code-mode", command_type: "config", category: "Session", description: "Primary autonomous coding mode. Kilo reads, writes, and executes to implement features end-to-end.", syntax: "Code mode (IDE)", risk_level: "medium", source_url: "https://kilo.ai/docs/code-with-ai/agent-modes" },
    { name: "Architect mode", slug: "architect-mode", command_type: "config", category: "Session", description: "High-level planning and architecture design mode. Focuses on structure without writing code.", syntax: "Architect mode (IDE)", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/agent-modes" },
    { name: "Debug mode", slug: "debug-mode", command_type: "config", category: "Session", description: "Specialized debugging mode. Analyzes errors, traces root causes, and suggests targeted fixes.", syntax: "Debug mode (IDE)", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/agent-modes" },
    { name: "Ask mode", slug: "ask-mode", command_type: "config", category: "Session", description: "Read-only Q&A mode. Kilo answers questions about the codebase without making any changes.", syntax: "Ask mode (IDE)", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/agent-modes" },
    { name: "Orchestrator mode", slug: "orchestrator-mode", command_type: "config", category: "Session", description: "Multi-agent orchestration mode. Spawns sub-agents (Code, Architect, Debug) to parallelize complex tasks.", syntax: "Orchestrator mode (IDE)", risk_level: "high", source_url: "https://kilo.ai/docs/code-with-ai/agent-modes" },
    { name: ".kilo/rules/", slug: "kilo-rules", command_type: "config", category: "Config", description: "Project rules directory. Markdown files define coding standards injected into every session.", syntax: ".kilo/rules/", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/platforms/cli" },
    { name: "Kilo Gateway", slug: "kilo-gateway", command_type: "config", category: "Model", description: "Kilo's model router. Provides access to 500+ models (Claude, GPT-4o, Gemini, DeepSeek, etc.).", syntax: "Kilo Gateway (IDE settings)", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/platforms/cli" },
    { name: "Auto-approve", slug: "auto-approve", command_type: "config", category: "Permission", description: "Skip confirmation for specific tool categories (file edits, terminal, browser, MCP).", syntax: "Auto-approve (IDE settings)", risk_level: "high", source_url: "https://kilo.ai/docs/code-with-ai/platforms/cli" },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Connect MCP servers to extend Kilo with custom tools, APIs, and data sources.", syntax: "MCP server (IDE settings)", risk_level: "medium", source_url: "https://kilo.ai/docs/code-with-ai/platforms/cli" },
    { name: "/newtask", slug: "newtask", command_type: "slash", category: "Session", description: "Start a new task in a fresh context while preserving the current conversation summary.", syntax: "/newtask", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/slash-commands" },
    { name: "/smolrules", slug: "smolrules", command_type: "slash", category: "Config", description: "Show the active project rules currently injected into the session.", syntax: "/smolrules", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/slash-commands" },
    { name: "/reportbug", slug: "reportbug", command_type: "slash", category: "Session", description: "Report a bug to the Kilo team directly from the IDE.", syntax: "/reportbug", risk_level: "low", source_url: "https://kilo.ai/docs/code-with-ai/slash-commands" },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Kilo Code`);
  return commands;
}
