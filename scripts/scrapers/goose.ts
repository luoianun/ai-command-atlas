import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("goose");

const CLI_COMMANDS_URL = "https://goose-docs.ai/docs/guides/goose-cli-commands/";

const config: ScraperConfig = {
  toolSlug: "goose",
  toolName: "Goose",
  sources: [
    { url: CLI_COMMANDS_URL, type: "html", label: "CLI commands" },
  ],
  slugify: (name: string) =>
    name
      .replace(/[​-‍﻿]/g, "")
      .replace(/^[-/]+/, "")
      .replace(/`/g, "")
      .replace(/\s*\[[^\]]*\]\s*/g, " ")
      .replace(/\s*<[^>]+>\s*/g, " ")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._/@-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function cleanText(text: string): string {
  return text.replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
}

function mapCategory(section: string): string {
  const s = section.toLowerCase();
  if (s.includes("session") || s.includes("resume") || s.includes("history") || s.includes("run")) return "Session";
  if (s.includes("config") || s.includes("recipe") || s.includes("hints") || s.includes("project")) return "Config";
  if (s.includes("perm") || s.includes("mode") || s.includes("approv") || s.includes("plan")) return "Permission";
  if (s.includes("mcp") || s.includes("extension") || s.includes("plugin")) return "MCP";
  if (s.includes("model") || s.includes("provider")) return "Model";
  return "General";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const combined = (name + " " + desc).toLowerCase();
  if (combined.includes("auto") || combined.includes("extension") || combined.includes("stdio")) return "high";
  if (combined.includes("approve") || combined.includes("permission") || combined.includes("run") || combined.includes("mcp") || combined.includes("plugin")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function commandTypeFor(name: string): ScrapedCommand["command_type"] {
  if (name.startsWith("/")) return "slash";
  if (name.startsWith("--")) return "option";
  if (name.startsWith("@")) return "slash";
  return "subcommand";
}

function parseHeadingCommands(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "General";

  $("main").find("h2, h3, h4").each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const text = cleanText($el.text());
    if (!text) return;

    if (tag === "h2" || tag === "h3") {
      currentSection = text;
      return;
    }

    const rawName = cleanText($el.find("code").first().text() || text);
    if (!rawName) return;

    const descParts: string[] = [];
    let sibling = $el.next();
    while (sibling.length && !sibling.is("h2,h3,h4")) {
      if (sibling.is("p,li")) {
        const t = cleanText(sibling.text());
        if (t) descParts.push(t);
      }
      sibling = sibling.next();
    }
    const description = descParts.join(" ") || `${rawName} command.`;

    addCommand(commands, seen, {
      name: rawName,
      slug: config.slugify(rawName),
      command_type: commandTypeFor(rawName),
      category: mapCategory(currentSection + " " + rawName),
      description,
      syntax: rawName.startsWith("goose") || rawName.startsWith("/") || rawName.startsWith("@") ? rawName : `goose ${rawName}`,
      risk_level: inferRisk(rawName, description),
      source_url: CLI_COMMANDS_URL,
    });
  });
}

function parseSlashCommands(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  const slashHeading = $("main h3").filter((_, el) => cleanText($(el).text()) === "Slash Commands").first();
  if (!slashHeading.length) return;

  let sibling = slashHeading.next();
  while (sibling.length && !sibling.is("h2,h3")) {
    sibling.find("li").addBack("li").each((_, li) => {
      const text = cleanText($(li).text());
      const match = text.match(/^(\/[^\s]+(?:\s+or\s+\/[^\s]+)?(?:\s+<[^>]+>)?(?:\s+\[[^\]]+\])?)/);
      if (!match) return;

      const name = match[1].split(/\s+or\s+/)[0].trim();
      const description = text.replace(match[1], "").replace(/^[-–—]\s*/, "").trim() || `${name} slash command.`;
      addCommand(commands, seen, {
        name,
        slug: config.slugify(name),
        command_type: "slash",
        category: mapCategory("Slash Commands " + name + " " + description),
        description,
        syntax: match[1],
        risk_level: inferRisk(name, description),
        source_url: CLI_COMMANDS_URL,
      });
    });
    sibling = sibling.next();
  }
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  log.info(`Fetching ${CLI_COMMANDS_URL}`);
  try {
    const html = await fetchHtml(CLI_COMMANDS_URL);
    parseHeadingCommands(html, commands, seen);
    parseSlashCommands(html, commands, seen);
    log.success(`Scraped ${commands.length} commands from Goose`);
  } catch (err: any) {
    log.warn(`CLI page failed: ${err.message}`);
  }

  const known: ScrapedCommand[] = [
    { name: "--provider", slug: "provider", command_type: "option", category: "Model", description: "Select the AI provider for the session.", syntax: "goose --provider <provider>", value_hint: "<provider>", risk_level: "low", source_url: CLI_COMMANDS_URL },
    { name: "--model", slug: "model", command_type: "option", category: "Model", description: "Specify the model to use for the session.", syntax: "goose --model <model-id>", value_hint: "<model-id>", risk_level: "low", source_url: CLI_COMMANDS_URL },
  ];

  for (const k of known) addCommand(commands, seen, k);

  return commands;
}
