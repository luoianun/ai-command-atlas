import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchHtml, parseHtml } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("opencode");

const config: ScraperConfig = {
  toolSlug: "opencode",
  toolName: "OpenCode",
  sources: [
    { url: "https://opencode.ai/docs/cli/", type: "html", label: "CLI (en)" },
    { url: "https://opencode.ai/docs/zh-cn/cli/", type: "html", label: "CLI (zh)" },
    { url: "https://opencode.ai/docs/tui/", type: "html", label: "TUI (en)" },
    { url: "https://opencode.ai/docs/zh-cn/tui/", type: "html", label: "TUI (zh)" },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-/]+/, "")
      .replace(/\s+.*$/, "")
      .replace(/\s+/g, "-")
      .toLowerCase(),
};

export { config };

interface ParsedEntry {
  slug: string;
  name: string;
  description: string;
  command_type: "option" | "flag" | "slash" | "subcommand";
  category: string;
  syntax: string;
  value_hint: string | null;
  source_url: string;
}

function slugify(name: string): string {
  return name
    .replace(/^[-/]+/, "")
    .replace(/\s+.*$/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function parseCliPage(html: string, url: string): Map<string, ParsedEntry> {
  const $ = parseHtml(html);
  const entries = new Map<string, ParsedEntry>();
  let currentCategory = "General";

  $("main h2, main h3, main h4").each((_, el) => {
    const $el = $(el);
    const tag = (el as any).tagName?.toLowerCase() ?? (el as any).name?.toLowerCase();
    const rawText = $el.text().replace(/\s+/g, " ").trim();

    // h2 = section headers like "命令" / "Commands"
    if (tag === "h2") {
      const lower = rawText.toLowerCase();
      if (lower.includes("command") || lower === "命令") currentCategory = "Subcommand";
      else if (lower.includes("config") || lower.includes("配置")) currentCategory = "Config";
      else if (lower.includes("mcp")) currentCategory = "MCP";
      return;
    }

    // h3 = subcommand names (e.g. agent, auth, mcp, models, run, serve, session, tui)
    if (tag === "h3") {
      const name = rawText;
      // skip TOC / non-command headings
      if (!name || name.includes("本页") || name.includes("this page") || name.length > 40) return;

      // Collect description from following <p> elements until next heading
      const descParts: string[] = [];
      let sib = $el.next();
      while (sib.length && !sib.is("h2,h3,h4")) {
        if (sib.is("p")) descParts.push(sib.text().replace(/\s+/g, " ").trim());
        sib = sib.next();
      }
      const description = descParts.join(" ").trim();
      if (!description) return;

      const slug = slugify(name);
      if (!entries.has(slug)) {
        entries.set(slug, {
          slug,
          name,
          description,
          command_type: "subcommand",
          category: currentCategory === "Subcommand" ? "Subcommand" : "Session",
          syntax: `opencode ${name}`,
          value_hint: null,
          source_url: url,
        });
      }
      return;
    }

    // h4 = sub-subcommands (e.g. agent create, mcp add) or flag sections
    if (tag === "h4") {
      const lower = rawText.toLowerCase();
      // skip "标志" / "flags" / "options" heading sections
      if (lower === "标志" || lower === "flags" || lower === "options" || lower === "attention") return;

      // Check if it's a flag (starts with --)
      const codeEl = $el.find("code");
      const flagText = codeEl.length ? codeEl.first().text().trim() : rawText;

      if (flagText.startsWith("--")) {
        const parts = flagText.split(/\s+/);
        const flagName = parts[0];
        const slug = slugify(flagName);
        if (entries.has(slug)) return;

        const valueHint = parts.length > 1 ? parts.slice(1).join(" ") : null;
        const descParts: string[] = [];
        let sib = $el.next();
        while (sib.length && !sib.is("h2,h3,h4")) {
          if (sib.is("p")) descParts.push(sib.text().replace(/\s+/g, " ").trim());
          sib = sib.next();
        }
        const description = descParts.join(" ").trim();
        if (!description) return;

        entries.set(slug, {
          slug,
          name: flagName,
          description,
          command_type: valueHint ? "option" : "flag",
          category: currentCategory,
          syntax: `opencode ${flagText}`,
          value_hint: valueHint,
          source_url: url,
        });
        return;
      }

      // Sub-subcommand (e.g. "create", "list", "login" under a parent h3)
      const slug = rawText.toLowerCase().trim();
      if (!slug || slug.length > 30) return;

      const descParts: string[] = [];
      let sib = $el.next();
      while (sib.length && !sib.is("h2,h3,h4")) {
        if (sib.is("p")) descParts.push(sib.text().replace(/\s+/g, " ").trim());
        sib = sib.next();
      }
      const description = descParts.join(" ").trim();
      if (!description || entries.has(slug)) return;

      entries.set(slug, {
        slug,
        name: rawText,
        description,
        command_type: "subcommand",
        category: currentCategory === "Subcommand" ? "Subcommand" : "Session",
        syntax: `opencode ${rawText}`,
        value_hint: null,
        source_url: url,
      });
    }
  });

  return entries;
}

function parseTuiPage(html: string, url: string): Map<string, ParsedEntry> {
  const $ = parseHtml(html);
  const entries = new Map<string, ParsedEntry>();
  let inCommands = false;

  $("main h2, main h3").each((_, el) => {
    const $el = $(el);
    const tag = (el as any).tagName?.toLowerCase() ?? (el as any).name?.toLowerCase();
    const text = $el.text().replace(/\s+/g, " ").trim();

    if (tag === "h2") {
      const lower = text.toLowerCase();
      inCommands = lower === "commands" || lower === "命令";
      return;
    }

    if (tag === "h3" && inCommands) {
      const cmdName = text.toLowerCase().trim();
      if (!cmdName || cmdName === "options" || cmdName === "attention" || cmdName.length > 30) return;

      const slug = `tui-${cmdName}`;
      if (entries.has(slug)) return;

      const descParts: string[] = [];
      let sib = $el.next();
      while (sib.length && !sib.is("h2,h3")) {
        if (sib.is("p")) descParts.push(sib.text().replace(/\s+/g, " ").trim());
        sib = sib.next();
      }
      const description = descParts.join(" ").trim();
      if (!description) return;

      entries.set(slug, {
        slug,
        name: `/${cmdName}`,
        description,
        command_type: "slash",
        category: "Session",
        syntax: `/${cmdName}`,
        value_hint: null,
        source_url: url,
      });
    }
  });

  return entries;
}

export async function scrape(): Promise<ScrapedCommand[]> {
  // Fetch all four pages in parallel
  const [cliEnHtml, cliZhHtml, tuiEnHtml, tuiZhHtml] = await Promise.all([
    fetchHtml("https://opencode.ai/docs/cli/").then(h => { log.success("CLI (en) fetched"); return h; }),
    fetchHtml("https://opencode.ai/docs/zh-cn/cli/").then(h => { log.success("CLI (zh) fetched"); return h; }),
    fetchHtml("https://opencode.ai/docs/tui/").then(h => { log.success("TUI (en) fetched"); return h; }),
    fetchHtml("https://opencode.ai/docs/zh-cn/tui/").then(h => { log.success("TUI (zh) fetched"); return h; }),
  ]);

  const cliEn = parseCliPage(cliEnHtml, "https://opencode.ai/docs/cli/");
  const cliZh = parseCliPage(cliZhHtml, "https://opencode.ai/docs/zh-cn/cli/");
  const tuiEn = parseTuiPage(tuiEnHtml, "https://opencode.ai/docs/tui/");
  const tuiZh = parseTuiPage(tuiZhHtml, "https://opencode.ai/docs/zh-cn/tui/");

  log.info(`CLI en: ${cliEn.size}, CLI zh: ${cliZh.size}, TUI en: ${tuiEn.size}, TUI zh: ${tuiZh.size}`);

  const commands: ScrapedCommand[] = [];

  // Merge CLI entries: en as base, zh fills description_zh
  for (const [slug, entry] of cliEn) {
    const zhEntry = cliZh.get(slug);
    commands.push({
      name: entry.name,
      slug: entry.slug,
      command_type: entry.command_type,
      category: entry.category,
      description: entry.description,
      description_zh: zhEntry?.description ?? null,
      syntax: entry.syntax,
      value_hint: entry.value_hint,
      parameters: null,
      examples: null,
      notes: null,
      caveats: null,
      source_url: entry.source_url,
      risk_level: "low",
    });
  }

  // Add zh-only entries not found in en
  for (const [slug, zhEntry] of cliZh) {
    if (cliEn.has(slug)) continue;
    commands.push({
      name: zhEntry.name,
      slug: zhEntry.slug,
      command_type: zhEntry.command_type,
      category: zhEntry.category,
      description: zhEntry.description,
      description_zh: zhEntry.description,
      syntax: zhEntry.syntax,
      value_hint: zhEntry.value_hint,
      parameters: null,
      examples: null,
      notes: null,
      caveats: null,
      source_url: "https://opencode.ai/docs/cli/",
      risk_level: "low",
    });
  }

  // Merge TUI entries
  for (const [slug, entry] of tuiEn) {
    const zhEntry = tuiZh.get(slug);
    commands.push({
      name: entry.name,
      slug: entry.slug,
      command_type: entry.command_type,
      category: entry.category,
      description: entry.description,
      description_zh: zhEntry?.description ?? null,
      syntax: entry.syntax,
      value_hint: entry.value_hint,
      parameters: null,
      examples: null,
      notes: null,
      caveats: null,
      source_url: entry.source_url,
      risk_level: "low",
    });
  }

  for (const [slug, zhEntry] of tuiZh) {
    if (tuiEn.has(slug)) continue;
    commands.push({
      name: zhEntry.name,
      slug: zhEntry.slug,
      command_type: zhEntry.command_type,
      category: zhEntry.category,
      description: zhEntry.description,
      description_zh: zhEntry.description,
      syntax: zhEntry.syntax,
      value_hint: zhEntry.value_hint,
      parameters: null,
      examples: null,
      notes: null,
      caveats: null,
      source_url: "https://opencode.ai/docs/tui/",
      risk_level: "low",
    });
  }

  log.success(`Total: ${commands.length} commands`);
  return commands;
}
