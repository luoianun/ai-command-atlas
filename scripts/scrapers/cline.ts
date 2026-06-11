import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("cline");

const config: ScraperConfig = {
  toolSlug: "cline",
  toolName: "Cline",
  sources: [
    { url: "https://docs.cline.bot/cli/cli-reference", type: "html", label: "CLI reference" },
    { url: "https://docs.cline.bot/features/slash-commands", type: "html", label: "Slash commands" },
    { url: "https://docs.cline.bot/features/api-configuration", type: "html", label: "API config" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("mcp")) return "MCP";
  if (t.includes("model") || t.includes("provider") || t.includes("api")) return "Model";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("memory")) return "Config";
  if (t.includes("perm") || t.includes("mode") || t.includes("plan") || t.includes("act") || t.includes("auto")) return "Permission";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("dangerously") || combined.includes("auto-approve") || combined.includes("yolo")) return "high";
  if (combined.includes("act mode") || combined.includes("autonomous") || combined.includes("auto")) return "medium";
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
      $("main, article, .page-body").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const tag = (el.tagName || (el as any).name || "").toLowerCase();
        const text = $el.text().trim();
        if (!text) return;

        if (tag === "h2") { currentSection = text; return; }

        // Accept: slash commands, -- flags, named modes/features
        const isSlash = text.startsWith("/");
        const isFlag = text.startsWith("--") || text.startsWith("-");
        const isNamedFeature = /\b(mode|rules?|memory|plan|checkpoint|mcp|api|provider|model|diff|task)\b/i.test(text);
        if (!isSlash && !isFlag && !isNamedFeature) return;
        if (text.length > 80) return;

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
            syntax: text,
            risk_level: inferRisk(text, description),
            source_url: source.url,
          });
        }
      });
    } catch (err: any) {
      log.warn(`${source.url} failed (likely SPA): ${err.message}`);
    }
  }

  // Cline docs are GitBook SPA — ensure core commands are always present
  const known: ScrapedCommand[] = [
    { name: "Plan mode", slug: "plan-mode", command_type: "config", category: "Permission", description: "Cline thinks and plans before acting. Review the proposed steps before execution begins.", syntax: "Plan mode (IDE)", risk_level: "low", source_url: "https://docs.cline.bot/features/plan-and-act" },
    { name: "Act mode", slug: "act-mode", command_type: "config", category: "Permission", description: "Cline autonomously executes file edits, terminal commands, and browser actions.", syntax: "Act mode (IDE)", risk_level: "medium", source_url: "https://docs.cline.bot/features/plan-and-act" },
    { name: "/newrule", slug: "newrule", command_type: "slash", category: "Config", description: "Create a new project or global rule file to guide Cline's behavior.", syntax: "/newrule", risk_level: "low", source_url: "https://docs.cline.bot/features/slash-commands" },
    { name: "/smol", slug: "smol", command_type: "slash", category: "Session", description: "Compact mode: strip verbose output and condense the response.", syntax: "/smol", risk_level: "low", source_url: "https://docs.cline.bot/features/slash-commands" },
    { name: ".clinerules", slug: "clinerules", command_type: "config", category: "Config", description: "Project-level rules file injected into every Cline session for the workspace.", syntax: ".clinerules", risk_level: "low", source_url: "https://docs.cline.bot/features/clinerules" },
    { name: ".clineignore", slug: "clineignore", command_type: "config", category: "Config", description: "Gitignore-style file specifying which files Cline cannot read or edit.", syntax: ".clineignore", risk_level: "low", source_url: "https://docs.cline.bot/features/clineignore" },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Add external MCP servers to extend Cline with custom tools, APIs, and data sources.", syntax: "MCP server (IDE settings)", risk_level: "medium", source_url: "https://docs.cline.bot/mcp/mcp-overview" },
    { name: "Checkpoints", slug: "checkpoints", command_type: "config", category: "Session", description: "Auto-saved snapshots of file state before each Cline action. Restore any prior state.", syntax: "Checkpoints (IDE)", risk_level: "low", source_url: "https://docs.cline.bot/features/checkpoints" },
    { name: "Auto-approve", slug: "auto-approve", command_type: "config", category: "Permission", description: "Skip confirmation for specific action types (read, write, execute, browser, MCP).", syntax: "Auto-approve (IDE settings)", risk_level: "high", source_url: "https://docs.cline.bot/features/auto-approve" },
    { name: "Model provider", slug: "model-provider", command_type: "config", category: "Model", description: "Configure the AI provider and model (Anthropic, OpenAI, Gemini, Ollama, etc.).", syntax: "Model provider (IDE settings)", risk_level: "low", source_url: "https://docs.cline.bot/features/api-configuration" },
    { name: "Browser tool", slug: "browser-tool", command_type: "config", category: "Permission", description: "Enable Cline to launch a browser, navigate URLs, click, and take screenshots autonomously.", syntax: "Browser tool (IDE settings)", risk_level: "medium", source_url: "https://docs.cline.bot/features/browser-use" },
    { name: "Terminal tool", slug: "terminal-tool", command_type: "config", category: "Permission", description: "Allow Cline to run shell commands in the VS Code integrated terminal.", syntax: "Terminal tool (IDE settings)", risk_level: "medium", source_url: "https://docs.cline.bot/features/shell-integration" },
    { name: "Context window", slug: "context-window", command_type: "config", category: "Config", description: "View current token usage; Cline auto-compresses history when approaching the model limit.", syntax: "Context window (IDE UI)", risk_level: "low", source_url: "https://docs.cline.bot/features/context-window-management" },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Cline`);
  return commands;
}
