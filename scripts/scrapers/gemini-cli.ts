import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("gemini-cli");

const COMMANDS_URL = "https://geminicli.com/docs/reference/commands/";
const CONFIGURATION_URL = "https://geminicli.com/docs/reference/configuration/";

const config: ScraperConfig = {
  toolSlug: "gemini-cli",
  toolName: "Gemini CLI",
  sources: [
    { url: COMMANDS_URL, type: "html", label: "Commands reference" },
    { url: CONFIGURATION_URL, type: "html", label: "Configuration reference" },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-/`]+/, "")
      .replace(/`/g, "")
      .replace(/\s+\(or\s+[^)]+\)/i, "")
      .replace(/\s+.*$/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase(),
};

export { config };

function inferCategory(name: string, desc: string): string {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("alias")) return "Model";
  if (lower.includes("mcp") || lower.includes("extension") || lower.includes("skill") || lower.includes("tool") || lower.includes("agent")) return "MCP";
  if (lower.includes("permission") || lower.includes("sandbox") || lower.includes("approval") || lower.includes("trust") || lower.includes("yolo") || lower.includes("policy")) return "Permission";
  if (lower.includes("session") || lower.includes("resume") || lower.includes("clear") || lower.includes("compress") ||
      lower.includes("help") || lower.includes("quit") || lower.includes("compact") || lower.includes("reload") || lower.includes("chat")) return "Session";
  return "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("yolo") || lower.includes("dangerously") || lower.includes("auto-approve all")) return "high";
  if (lower.includes("sandbox") || lower.includes("approval") || lower.includes("skip-trust") || lower.includes("auto_edit") || lower.includes("policy")) return "medium";
  return "low";
}

function addCommand(commands: ScrapedCommand[], seen: Set<string>, command: ScrapedCommand): void {
  if (!command.slug || seen.has(command.slug)) return;
  seen.add(command.slug);
  commands.push(command);
}

function textOf($: ReturnType<typeof parseHtml>, el: any): string {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function fieldValue($: ReturnType<typeof parseHtml>, root: any, label: string): string {
  let value = "";
  $(root).find("li").each((_, li) => {
    const $li = $(li);
    const strong = $li.children("strong").first().text().replace(/:\s*$/, "").trim().toLowerCase();
    if (strong === label.toLowerCase()) {
      $li.children("strong").first().remove();
      value = $li.text().replace(/\s+/g, " ").replace(/^:\s*/, "").trim();
      return false;
    }
  });
  return value;
}

function contentAfterHeading($: ReturnType<typeof parseHtml>, heading: any): any[] {
  const start = $(heading).parent(".sl-heading-wrapper").length ? $(heading).parent() : $(heading);
  const out: any[] = [];
  let sibling = start.next();
  while (sibling.length && !sibling.is(".sl-heading-wrapper, h1, h2, h3, h4")) {
    out.push(sibling.get(0));
    sibling = sibling.next();
  }
  return out;
}

function parseCommandsPage(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);
  let currentSection = "Slash commands";

  $("main h2, main h3").each((_, el) => {
    const tag = (el.tagName || (el as any).name || "").toLowerCase();
    const title = textOf($, el);
    if (!title) return;

    if (tag === "h2") {
      currentSection = title;
      return;
    }

    if (title === "Built-in Commands") return;

    const blocks = contentAfterHeading($, el);
    const description = blocks
      .map((block) => fieldValue($, block, "Description") || ($(block).is("p") ? textOf($, block) : ""))
      .filter(Boolean)
      .join(" ")
      .trim() || `${title} command.`;

    const isSlash = title.startsWith("/");
    const isAtCommand = currentSection.toLowerCase().includes("at commands") || title.startsWith("@");
    const isShell = currentSection.toLowerCase().includes("shell") || title.startsWith("!");
    const commandType = isSlash || isAtCommand || isShell ? "slash" : "config";
    const syntax = isSlash || isAtCommand || isShell ? title : title;

    addCommand(commands, seen, {
      name: title,
      slug: config.slugify(title),
      command_type: commandType,
      category: inferCategory(currentSection + " " + title, description),
      description,
      syntax,
      source_url: COMMANDS_URL,
      risk_level: inferRisk(title, description),
    });

    for (const block of blocks) {
      $(block).find("li").each((__, li) => {
        const usage = fieldValue($, li, "Usage");
        if (!usage) return;
        const name = usage.split(/\s+/).slice(0, 2).join(" ");
        const desc = fieldValue($, li, "Description") || `${name} command.`;
        addCommand(commands, seen, {
          name,
          slug: config.slugify(name),
          command_type: "slash",
          category: inferCategory(title + " " + name, desc),
          description: desc,
          syntax: usage,
          source_url: COMMANDS_URL,
          risk_level: inferRisk(name, desc),
        });
      });
    }
  });
}

function parseConfigurationPage(html: string, commands: ScrapedCommand[], seen: Set<string>): void {
  const $ = parseHtml(html);

  $("main h4").each((_, el) => {
    const section = textOf($, el);
    const blocks = contentAfterHeading($, el);
    for (const block of blocks) {
      if (!$(block).is("ul")) continue;

      $(block).children("li").each((__, li) => {
        const name = $(li).children("p").first().find("strong code").first().text().trim();
        if (!name) return;

        const headerText = $(li).children("p").first().text().replace(/\s+/g, " ").trim();
        const typeMatch = headerText.match(/\(([^)]+)\)/);
        const valueType = typeMatch?.[1] || "setting";
        const description = fieldValue($, li, "Description") || `${name} setting.`;
        const defaultValue = fieldValue($, li, "Default");
        const values = fieldValue($, li, "Values");
        const restart = fieldValue($, li, "Requires restart");
        const notes = [
          `Type: ${valueType}`,
          defaultValue ? `Default: ${defaultValue}` : "",
          values ? `Values: ${values}` : "",
          restart ? `Requires restart: ${restart}` : "",
        ].filter(Boolean);

        addCommand(commands, seen, {
          name,
          slug: `config-${config.slugify(name)}`,
          command_type: "config",
          category: inferCategory(section + " " + name, description),
          description,
          syntax: `settings.json: ${name}`,
          value_hint: valueType,
          notes,
          source_url: CONFIGURATION_URL,
          risk_level: inferRisk(name, description),
        });
      });
    }
  });

  $("main h2").each((_, el) => {
    const title = textOf($, el);
    if (!title || title.length > 80) return;
    if (!["Settings files", "Environment variables and .env files", "Command-line arguments", "Context files (hierarchical instructional context)", "Sandboxing"].includes(title)) return;

    const blocks = contentAfterHeading($, el);
    const description = blocks
      .filter((block) => $(block).is("p"))
      .map((block) => textOf($, block))
      .filter(Boolean)
      .join(" ")
      .trim() || `${title} configuration.`;

    addCommand(commands, seen, {
      name: title,
      slug: config.slugify(title),
      command_type: "config",
      category: inferCategory(title, description),
      description,
      syntax: title,
      source_url: CONFIGURATION_URL,
      risk_level: inferRisk(title, description),
    });
  });
}

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const seen = new Set<string>();

  log.info(`Fetching ${COMMANDS_URL}`);
  try {
    const html = await fetchHtml(COMMANDS_URL);
    parseCommandsPage(html, commands, seen);
    log.success(`Scraped ${commands.length} commands from commands reference`);
  } catch (err: any) {
    log.warn(`${COMMANDS_URL} failed: ${err.message}`);
  }

  log.info(`Fetching ${CONFIGURATION_URL}`);
  try {
    const before = commands.length;
    const html = await fetchHtml(CONFIGURATION_URL);
    parseConfigurationPage(html, commands, seen);
    log.success(`Scraped ${commands.length - before} configuration entries`);
  } catch (err: any) {
    log.warn(`${CONFIGURATION_URL} failed: ${err.message}`);
  }

  const known: ScrapedCommand[] = [
    { name: "--model", slug: "model", command_type: "option", category: "Model", description: "Select the Gemini model variant (e.g. gemini-2.5-pro, auto).", syntax: "gemini --model <model-id>", value_hint: "<model-id>", source_url: CONFIGURATION_URL, risk_level: "low" },
    { name: "--prompt", slug: "prompt", command_type: "option", category: "Session", description: "Non-interactive prompt. Forces headless mode and exits when done.", syntax: 'gemini --prompt "<query>"', value_hint: "<query>", source_url: CONFIGURATION_URL, risk_level: "low" },
    { name: "--sandbox", slug: "sandbox", command_type: "flag", category: "Permission", description: "Run in a sandboxed environment for safer code execution.", syntax: "gemini --sandbox", source_url: CONFIGURATION_URL, risk_level: "medium" },
    { name: "--yolo", slug: "yolo", command_type: "flag", category: "Permission", description: "Auto-approve all tool actions without confirmation. Deprecated in favor of --approval-mode=yolo.", syntax: "gemini --yolo", source_url: CONFIGURATION_URL, risk_level: "high" },
    { name: "--approval-mode", slug: "approval-mode", command_type: "option", category: "Permission", description: "Control tool approval: default, auto_edit, yolo, plan.", syntax: "gemini --approval-mode <mode>", value_hint: "default|auto_edit|yolo|plan", source_url: CONFIGURATION_URL, risk_level: "medium" },
    { name: "--resume", slug: "resume", command_type: "option", category: "Session", description: "Resume a previous session by ID or 'latest'.", syntax: 'gemini --resume "latest"', value_hint: "<session-id|latest>", source_url: CONFIGURATION_URL, risk_level: "low" },
    { name: "GEMINI.md", slug: "gemini-md", command_type: "config", category: "Config", description: "Custom instructions file loaded from project root, injected into every session.", syntax: "GEMINI.md", source_url: CONFIGURATION_URL, risk_level: "low" },
  ];

  for (const k of known) addCommand(commands, seen, k);

  log.success(`Scraped ${commands.length} commands from Gemini CLI`);
  return commands;
}
