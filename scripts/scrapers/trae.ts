import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("trae");

const TRAE_CLI_DOCS = [
  { url: "https://www.volcengine.com/docs/86677/2227860?lang=zh", label: "What is TRAE CLI" },
  { url: "https://www.volcengine.com/docs/86677/2227861?lang=zh", label: "Quick start" },
  { url: "https://www.volcengine.com/docs/86677/2227866?lang=zh", label: "Use cases and CLI arguments" },
  { url: "https://www.volcengine.com/docs/86677/2227864?lang=zh", label: "Slash commands" },
  { url: "https://www.volcengine.com/docs/86677/2227869?lang=zh", label: "Global settings" },
  { url: "https://www.volcengine.com/docs/86677/2227868?lang=zh", label: "Custom agents" },
  { url: "https://www.volcengine.com/docs/86677/2227862?lang=zh", label: "Models" },
  { url: "https://www.volcengine.com/docs/86677/2227873?lang=zh", label: "MCP" },
  { url: "https://www.volcengine.com/docs/86677/2272059?lang=zh", label: "Skills" },
  { url: "https://www.volcengine.com/docs/86677/2227867?lang=zh", label: "Memory" },
  { url: "https://www.volcengine.com/docs/86677/2227874?lang=zh", label: "Tool permissions" },
  { url: "https://www.volcengine.com/docs/86677/2227872?lang=zh", label: "Permission modes" },
  { url: "https://www.volcengine.com/docs/86677/2227875?lang=zh", label: "Response language" },
  { url: "https://www.volcengine.com/docs/86677/2227871?lang=zh", label: "Agent Client Protocol" },
  { url: "https://www.volcengine.com/docs/86677/2227863?lang=zh", label: "CLI login token" },
];

const IDE_DOCS = [
  { url: "https://docs.trae.ai/ide/builder-mode", type: "html" as const, label: "Builder mode" },
  { url: "https://docs.trae.ai/ide/chat-panel", type: "html" as const, label: "Chat panel" },
  { url: "https://docs.trae.ai/ide/rules", type: "html" as const, label: "Rules" },
  { url: "https://docs.trae.ai/ide/mcp", type: "html" as const, label: "MCP" },
];

const config: ScraperConfig = {
  toolSlug: "trae",
  toolName: "Trae",
  sources: [
    ...TRAE_CLI_DOCS.map((source) => ({ ...source, type: "html" as const })),
    ...IDE_DOCS,
  ],
  slugify: (name: string) =>
    name
      .replace(/[​-‍﻿]/g, "")
      .replace(/^[-/#@]+/, "")
      .replace(/`/g, "")
      .replace(/\\-/g, "-")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/[|,，].*$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._/@-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function cleanText(text: string): string {
  return text
    .replace(/[​-‍﻿]/g, "")
    .replace(/\\-/g, "-")
    .replace(/<br\s*\/?>(\s*)/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

function mapCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("model") || t.includes("provider") || t.includes("模型")) return "Model";
  if (t.includes("mcp") || t.includes("tool") || t.includes("工具") || t.includes("extension") || t.includes("插件")) return "MCP";
  if (t.includes("permission") || t.includes("权限") || t.includes("bypass") || t.includes("yolo")) return "Permission";
  if (t.includes("rule") || t.includes("config") || t.includes("setting") || t.includes("yaml") || t.includes("memory") || t.includes("agent") || t.includes("skill") || t.includes("设置") || t.includes("记忆") || t.includes("智能体") || t.includes("技能")) return "Config";
  return "Session";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("bypass_permissions") || combined.includes("yolo") || combined.includes("api key") || combined.includes("token") || combined.includes("令牌") || combined.includes("无授权")) return "high";
  if (combined.includes("execute") || combined.includes("tool") || combined.includes("mcp") || combined.includes("permission") || combined.includes("git") || combined.includes("bash") || combined.includes("工具") || combined.includes("权限")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || !/[a-z0-9]/i.test(command.slug) || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function commandTypeFor(name: string, section: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/") || name.startsWith("@")) return "slash";
  if (name.startsWith("--")) return name.includes("<") || name.includes(" ") ? "option" : "flag";
  if (/^[A-Z][A-Z0-9_]+$/.test(name) || /\.(description|argument-hint|tools|model|name)$/.test(name)) return "config";
  if (section.toLowerCase().includes("settings") || section.includes("设置") || section.includes("权限") || section.includes("模型") || section.includes("Skill")) return "config";
  return "subcommand";
}

function valueHintFromName(name: string): string | null {
  const match = name.match(/(<[^>]+>|\[[^\]]+\]|\b[A-Z][A-Z0-9_-]+\b)/);
  return match?.[0] || null;
}

function commandNameFromPrimary(primary: string): string {
  const longFlag = primary.match(/--[a-zA-Z][a-zA-Z0-9_-]*(?:\s+<[^>]+>)?/);
  if (longFlag) return cleanText(longFlag[0]);

  const slashCommand = primary.match(/\/[a-zA-Z][a-zA-Z0-9_-]*/);
  if (slashCommand) return slashCommand[0];

  return cleanText(primary.split(/\s+或\s+|\s*,\s*/)[0] || primary);
}

function extractVolcengineMarkdown(html: string): { title: string; markdown: string } | null {
  const match = html.match(/window\._ROUTER_DATA = (\{[\s\S]*?\})\s*<\/script>/);
  if (!match) return null;

  const data = JSON.parse(match[1]);
  const page = data.loaderData?.["docs/(libid)/(docid$)/page"];
  const doc = page?.curDoc;
  if (!doc?.MDContent) return null;

  return {
    title: cleanText(doc.Title || "TRAE CLI"),
    markdown: doc.MDContent,
  };
}

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map(cleanText);
}

function extractMarkdownTables(markdown: string): { headers: string[]; rows: string[][] }[] {
  const lines = markdown.split(/\r?\n/);
  const tables: { headers: string[]; rows: string[][] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/^\|.*\|\s*$/.test(lines[i]) || !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1] || "")) continue;

    const headers = splitTableRow(lines[i]);
    const rows: string[][] = [];
    i += 2;
    while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
      const cells = splitTableRow(lines[i]);
      if (cells.some(Boolean)) rows.push(cells);
      i++;
    }
    tables.push({ headers, rows });
  }

  return tables;
}

function sectionBefore(markdown: string, needle: string): string {
  const index = markdown.indexOf(needle);
  const before = index === -1 ? markdown : markdown.slice(0, index);
  const headings = [...before.matchAll(/^#{2,4}\s+(.+)$/gm)].map((match) => cleanText(match[1]));
  return headings.at(-1) || "TRAE CLI";
}

function parseTableCommands(sourceUrl: string, title: string, markdown: string, commands: ScrapedCommand[], seen: Set<string>): void {
  for (const table of extractMarkdownTables(markdown)) {
    if (!table.headers.length) continue;

    const firstHeader = table.headers[0];
    const tableAnchor = `|${table.headers[0]}`;
    const section = sectionBefore(markdown, tableAnchor) || title;

    for (const row of table.rows) {
      if (row.length < 2) continue;

      const primary = row[0];
      const description = row[Math.min(row.length - 1, table.headers.includes("是否必填") ? 2 : 1)] || row[1];
      if (!primary || !description) continue;

      const name = commandNameFromPrimary(primary);
      if (!name) continue;

      const isCommandLike = name.startsWith("/") || name.startsWith("--") || /^[A-Z][A-Z0-9_]+$/.test(name);
      const isConfigTable = /^(Frontmatter|字段|值|参数|类型|概念)$/i.test(firstHeader) || /权限|设置|模型|Skill|智能体|MCP/i.test(section + title);
      if (!isCommandLike && !isConfigTable) continue;
      if (!isCommandLike && /^(操作系统|检查项)$/i.test(firstHeader)) continue;

      const commandName = isCommandLike ? name : `${section}.${name}`;
      addCommand(commands, seen, {
        name: commandName,
        slug: config.slugify(commandName),
        command_type: commandTypeFor(commandName, section),
        category: mapCategory(`${title} ${section} ${commandName} ${description}`),
        description,
        syntax: primary,
        value_hint: valueHintFromName(primary),
        notes: row.length > 2 ? table.headers.slice(1).map((header, i) => `${header}: ${row[i + 1]}`).filter(Boolean) : null,
        risk_level: inferRisk(commandName, description),
        source_url: sourceUrl,
      });
    }
  }
}

function parseMarkdownHeadings(sourceUrl: string, title: string, markdown: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const headingMatches = [...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)];

  for (let i = 0; i < headingMatches.length; i++) {
    const match = headingMatches[i];
    const depth = match[1].length;
    const text = cleanText(match[2]);
    if (!text || text.length > 90) continue;

    const nextIndex = headingMatches[i + 1]?.index ?? markdown.length;
    const body = cleanText(markdown.slice((match.index || 0) + match[0].length, nextIndex));
    const isFeature = text.startsWith("/") || text.startsWith("@") || /模型|MCP|权限|工具|设置|智能体|Skill|技能|记忆|AGENTS|ACP|登录令牌|命令行参数|回复语言|全局设置|自定义斜杠命令/i.test(text);
    if (!isFeature) continue;

    addCommand(commands, seen, {
      name: text,
      slug: config.slugify(text),
      command_type: commandTypeFor(text, title),
      category: mapCategory(`${title} ${text} ${body}`),
      description: body.slice(0, 500) || `${text} feature.`,
      syntax: text,
      risk_level: inferRisk(text, body),
      source_url: sourceUrl,
    });

    if (depth <= 3 && /权限|设置|模型|Skill|智能体|MCP|记忆|ACP|登录令牌/.test(text)) {
      const configName = `${title}.${text}`;
      addCommand(commands, seen, {
        name: configName,
        slug: config.slugify(configName),
        command_type: "config",
        category: mapCategory(configName),
        description: body.slice(0, 500) || `${text} configuration.`,
        syntax: text,
        risk_level: inferRisk(configName, body),
        source_url: sourceUrl,
      });
    }
  }
}

function parseMarkdownInlineSymbols(sourceUrl: string, title: string, markdown: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const patterns = [
    /`(--[a-zA-Z][a-zA-Z0-9_-]*(?:\s+<[^>]+>)?)`/g,
    /`([A-Z][A-Z0-9_]{2,})`/g,
    /`(\$ARGUMENTS|\$N|\$\{N:-DefaultValue\}|!`command`)`/g,
    /`(\.traecli\/[a-zA-Z0-9_./-]+)`/g,
  ];

  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const name = cleanText(match[1]);
      if (!name || name.length > 80) continue;
      const idx = match.index || 0;
      const sentence = cleanText(markdown.slice(Math.max(0, idx - 180), Math.min(markdown.length, idx + 260)));
      addCommand(commands, seen, {
        name,
        slug: config.slugify(name),
        command_type: commandTypeFor(name, title),
        category: mapCategory(`${title} ${name} ${sentence}`),
        description: sentence || `${name} option.`,
        syntax: name,
        value_hint: valueHintFromName(name),
        risk_level: inferRisk(name, sentence),
        source_url: sourceUrl,
      });
    }
  }
}

function parseVolcengineDoc(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const doc = extractVolcengineMarkdown(html);
  if (!doc) return;

  parseTableCommands(sourceUrl, doc.title, doc.markdown, commands, seen);
  parseMarkdownHeadings(sourceUrl, doc.title, doc.markdown, commands, seen);
  parseMarkdownInlineSymbols(sourceUrl, doc.title, doc.markdown, commands, seen);
}

function parseIdeDoc(sourceUrl: string, html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);

  $("main, article, .content, [class*='article'], [class*='doc']").find("h2, h3, h4").each((_, el) => {
    const $el = $(el);
    const text = cleanText($el.text());
    if (!text || text.length > 80) return;

    const isSlash = text.startsWith("/") || text.startsWith("#") || text.startsWith("@");
    const isMode = /\b(mode|panel|chat|builder|inline|cue|rule|mcp|context|memory|tab)\b/i.test(text);
    if (!isSlash && !isMode) return;

    const descParts: string[] = [];
    let sibling = $el.next();
    while (sibling.length && !sibling.is("h1, h2, h3, h4")) {
      if (sibling.is("p")) {
        const t = cleanText(sibling.text());
        if (t) descParts.push(t);
      }
      sibling = sibling.next();
    }
    const description = descParts.join(" ").trim() || `${text} feature.`;

    addCommand(commands, seen, {
      name: text,
      slug: config.slugify(text),
      command_type: isSlash ? "slash" : "config",
      category: mapCategory(text),
      description,
      syntax: text,
      risk_level: inferRisk(text, description),
      source_url: sourceUrl,
    });
  });
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  for (const source of config.sources) {
    log.info(`Fetching ${source.url}`);
    try {
      const html = await fetchHtml(source.url);
      if (source.url.includes("volcengine.com")) {
        parseVolcengineDoc(source.url, html, commands, seen);
      } else {
        parseIdeDoc(source.url, html, commands, seen);
      }
      log.success(`Scraped from ${source.label}: ${commands.length} total`);
    } catch (err: any) {
      log.warn(`${source.url} failed: ${err.message}`);
    }
  }

  const known: ScrapedCommand[] = [
    { name: "trae", slug: "trae-cli", command_type: "subcommand", category: "Session", description: "Start TRAE CLI for terminal-based AI coding sessions.", syntax: "trae", risk_level: "low", source_url: "https://www.volcengine.com/docs/86677/2227861?lang=zh" },
    { name: "/agent-new", slug: "agent-new", command_type: "slash", category: "Config", description: "创建一个新的自定义智能体。", syntax: "/agent-new", risk_level: "low", source_url: "https://www.volcengine.com/docs/86677/2227864?lang=zh" },
    { name: "/clear", slug: "clear", command_type: "slash", category: "Session", description: "清空对话历史并释放上下文。", syntax: "/clear 或 /reset", risk_level: "low", source_url: "https://www.volcengine.com/docs/86677/2227864?lang=zh" },
    { name: "/terminal-setup", slug: "terminal-setup", command_type: "slash", category: "Session", description: "安装用于换行的 Shift+Enter 快捷键。", syntax: "/terminal-setup", risk_level: "low", source_url: "https://www.volcengine.com/docs/86677/2227864?lang=zh" },
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
    { name: "Model selection", slug: "model-selection", command_type: "config", category: "Model", description: "Switch between AI models per session or globally.", syntax: "Model selection", risk_level: "low", source_url: "https://www.volcengine.com/docs/86677/2227862?lang=zh" },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Trae`);
  return commands;
}
