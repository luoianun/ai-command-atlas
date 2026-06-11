import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("trae");

const config: ScraperConfig = {
  toolSlug: "trae",
  toolName: "Trae",
  sources: [
    { url: "https://www.volcengine.com/docs/86677/2227876", type: "html", label: "Trae CLI docs (Volcengine)" },
    { url: "https://docs.trae.ai/ide/builder-mode", type: "html", label: "Builder mode" },
    { url: "https://docs.trae.ai/ide/chat-panel", type: "html", label: "Chat panel" },
    { url: "https://docs.trae.ai/ide/rules", type: "html", label: "Rules" },
    { url: "https://docs.trae.ai/ide/mcp", type: "html", label: "MCP" },
  ],
  slugify: (name: string) =>
    name.replace(/^[-\/#@]+/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("provider")) return "Model";
  if (t.includes("mcp") || t.includes("tool") || t.includes("extension")) return "MCP";
  if (t.includes("rule") || t.includes("config") || t.includes("setting")) return "Config";
  if (t.includes("builder") || t.includes("implement") || t.includes("plan") || t.includes("chat") || t.includes("inline") || t.includes("cue")) return "Session";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("implement") || combined.includes("builder") || combined.includes("auto")) return "medium";
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

      $("main, article, .content, [class*='article'], [class*='doc']").find("h2, h3, h4").each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        if (!text || text.length > 80) return;

        const isSlash = text.startsWith("/") || text.startsWith("#") || text.startsWith("@");
        const isMode = /\b(mode|panel|chat|builder|inline|cue|rule|mcp|context|memory|tab)\b/i.test(text);
        if (!isSlash && !isMode) return;

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
            command_type: isSlash ? "slash" : "config",
            category: mapCategory(text),
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

  // Trae docs are SPA — comprehensive known[] ensures coverage
  const known: ScrapedCommand[] = [
    { name: "Builder mode", slug: "builder-mode", command_type: "config", category: "Session", description: "Generate a full project from a natural language description. Trae shows a change preview before applying.", syntax: "Builder mode (IDE)", risk_level: "medium", source_url: "https://docs.trae.ai/ide/builder-mode" },
    { name: "Chat mode", slug: "chat-mode", command_type: "config", category: "Session", description: "Side chat panel for code Q&A, explanations, inline code generation, and targeted edits.", syntax: "Chat mode (IDE)", risk_level: "low", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: "Inline Chat", slug: "inline-chat", command_type: "config", category: "Session", description: "Open a chat directly in the editor at cursor position for context-aware code edits.", syntax: "Inline Chat (Cmd/Ctrl+I)", risk_level: "low", source_url: "https://docs.trae.ai/ide/inline-chat" },
    { name: "Cue", slug: "cue", command_type: "config", category: "Session", description: "AI-powered inline code completion as you type, with multi-line suggestion support.", syntax: "Cue (inline completions)", risk_level: "low", source_url: "https://docs.trae.ai/ide/cue" },
    { name: "@file", slug: "at-file", command_type: "slash", category: "Session", description: "Reference a specific file in the current chat context.", syntax: "@<filename>", risk_level: "low", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: "@codebase", slug: "at-codebase", command_type: "slash", category: "Session", description: "Ask Trae to search and reason over the entire codebase to answer your question.", syntax: "@codebase", risk_level: "low", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: "@web", slug: "at-web", command_type: "slash", category: "Session", description: "Search the web and include results as context for the current prompt.", syntax: "@web", risk_level: "low", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: "@terminal", slug: "at-terminal", command_type: "slash", category: "Permission", description: "Include the terminal output as context. Trae can run commands and reference output.", syntax: "@terminal", risk_level: "medium", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: ".trae/rules/", slug: "project-rules", command_type: "config", category: "Config", description: "Project rules directory. Markdown files guide AI behavior for the entire project.", syntax: ".trae/rules/project_rules.md", risk_level: "low", source_url: "https://docs.trae.ai/ide/rules" },
    { name: "User rules", slug: "user-rules", command_type: "config", category: "Config", description: "Global user-level rules applied to all Trae sessions across all projects.", syntax: "User rules (IDE settings)", risk_level: "low", source_url: "https://docs.trae.ai/ide/rules" },
    { name: "MCP server", slug: "mcp-server", command_type: "config", category: "MCP", description: "Connect external MCP servers to extend Trae with custom tools, APIs, and data sources.", syntax: "MCP server (IDE settings)", risk_level: "medium", source_url: "https://docs.trae.ai/ide/mcp" },
    { name: "Model selection", slug: "model-selection", command_type: "config", category: "Model", description: "Switch between AI models (Claude, GPT-4o, Gemini, DeepSeek, etc.) per session or globally.", syntax: "Model selection (IDE settings)", risk_level: "low", source_url: "https://docs.trae.ai/ide/models" },
    { name: "Context files", slug: "context-files", command_type: "config", category: "Config", description: "Attach files, folders, or open tabs as context for the current chat session.", syntax: "Context files (IDE UI)", risk_level: "low", source_url: "https://docs.trae.ai/ide/chat-panel" },
    { name: "Tab completion", slug: "tab-completion", command_type: "config", category: "Session", description: "Accept the current Cue suggestion by pressing Tab.", syntax: "Tab (to accept Cue suggestion)", risk_level: "low", source_url: "https://docs.trae.ai/ide/cue" },
  ];

  for (const k of known) {
    if (!seen.has(k.slug)) {
      seen.add(k.slug);
      commands.push(k);
    }
  }

  log.success(`Scraped ${commands.length} commands from Trae`);
  return commands;
}
