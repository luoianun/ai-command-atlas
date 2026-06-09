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
    name.replace(/^[-/]+/, "").replace(/\s+.*$/, "").replace(/\s+/g, "-").toLowerCase(),
};

export { config };

interface ParsedEntry {
  slug: string;
  name: string;
  description: string;
  description_zh?: string | null;
  command_type: "option" | "flag" | "slash" | "subcommand";
  category: string;
  syntax: string;
  value_hint: string | null;
  source_url: string;
}

function makeSlug(_parent: string, flag: string): string {
  return flag.replace(/^--/, "").replace(/\s+.*$/, "").toLowerCase();
}

function parseCliPage(html: string, url: string): Map<string, ParsedEntry> {
  const $ = parseHtml(html);
  const entries = new Map<string, ParsedEntry>();

  // Walk all elements in <main> in DOM order, tracking current h3 context
  let currentH3 = "";    // e.g. "run", "mcp"
  let currentCategory = "Subcommand";
  let inCommandsSection = false;

  const isZh = url.includes("/zh-cn/");

  $("main > *").each((_, el) => {
    const $el = $(el);
    const tag = (el as any).tagName?.toLowerCase() ?? (el as any).name?.toLowerCase();

    // ── Section heading (h2) ────────────────────────────────────────
    if (tag === "h2") {
      const text = $el.text().replace(/\s+/g, " ").trim().toLowerCase();
      inCommandsSection = text === "commands" || text === "命令";
      if (text.includes("config") || text.includes("配置")) currentCategory = "Config";
      else if (text.includes("mcp")) currentCategory = "MCP";
      else currentCategory = "Subcommand";
      return;
    }

    // ── Subcommand heading (h3) ─────────────────────────────────────
    if (tag === "h3") {
      const text = $el.text().replace(/\s+/g, " ").trim();
      if (text.includes("本页") || text.includes("this page") || text.length > 40) return;

      currentH3 = text.toLowerCase();

      // Collect description from following <p> until next heading/table
      const descParts: string[] = [];
      let sib = $el.next();
      while (sib.length && !sib.is("h2,h3,h4,table")) {
        if (sib.is("p")) descParts.push(sib.text().replace(/\s+/g, " ").trim());
        sib = sib.next();
      }
      const description = descParts.join(" ").trim();
      if (!description) return;

      const slug = currentH3;
      if (!entries.has(slug)) {
        entries.set(slug, {
          slug,
          name: text,
          description,
          command_type: "subcommand",
          category: inCommandsSection ? "Subcommand" : "Session",
          syntax: `opencode ${text}`,
          value_hint: null,
          source_url: url,
        });
      }
      return;
    }

    // ── Flag heading (h4) ──────────────────────────────────────────
    if (tag === "h4") {
      const rawText = $el.text().replace(/\s+/g, " ").trim();
      const lower = rawText.toLowerCase();
      if (lower === "标志" || lower === "flags" || lower === "options" || lower === "attention") return;

      const codeEl = $el.find("code");
      const flagText = codeEl.length ? codeEl.first().text().trim() : rawText;

      if (flagText.startsWith("--")) {
        const parts = flagText.split(/\s+/);
        const flagName = parts[0];
        const valueHint = parts.length > 1 ? parts.slice(1).join(" ") : null;
        const slug = makeSlug(currentH3, flagName);
        if (entries.has(slug)) return;

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
          syntax: `opencode ${flagText}`.trim(),
          value_hint: valueHint,
          source_url: url,
        });
        return;
      }

      // Sub-subcommand heading (e.g. "create", "list")
      const slug = rawText.toLowerCase().trim();
      if (!slug || slug.length > 30 || entries.has(slug)) return;

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
        name: rawText,
        description,
        command_type: "subcommand",
        category: "Subcommand",
        syntax: `opencode ${currentH3} ${rawText}`.trim(),
        value_hint: null,
        source_url: url,
      });
      return;
    }

    // ── Flag tables ────────────────────────────────────────────────
    if (tag === "table") {
      // Determine column positions from header row
      const headerCells = $el.find("thead tr th, thead tr td, tbody tr:first-child th");
      const headers: string[] = [];
      headerCells.each((_, th) => headers.push($(th).text().trim().toLowerCase()));

      // Detect column indices
      const flagCol = headers.findIndex(h => h === "flag" || h === "标志" || h === "标记");
      const descCol = headers.findIndex(h => h.includes("desc") || h === "描述" || h === "说明");
      const shortCol = headers.findIndex(h => h === "short" || h === "简写" || h === "缩写");

      // Default: col 0 = flag, last = description
      const fIdx = flagCol >= 0 ? flagCol : 0;
      const dIdx = descCol >= 0 ? descCol : (shortCol >= 0 ? 2 : 1);

      $el.find("tbody tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const flagRaw = $(cells[fIdx]).text().trim();
        const desc = $(cells[dIdx] ?? cells[cells.length - 1]).text().replace(/\s+/g, " ").trim();

        if (!flagRaw.startsWith("--") || !desc) return;

        const flagParts = flagRaw.split(/\s+/);
        const flagName = flagParts[0];
        const valueHint = flagParts.length > 1 ? flagParts.slice(1).join(" ") : null;
        const slug = makeSlug(currentH3, flagName);

        if (isZh) {
          // For zh page: only fill in description_zh on existing en entries
          if (entries.has(slug)) {
            const existing = entries.get(slug)!;
            if (!existing.description_zh) {
              existing.description_zh = desc;
            }
          } else {
            // New entry only in zh — store with description_zh = desc, description = desc (fallback)
            entries.set(slug, {
              slug,
              name: flagName,
              description: desc,
              description_zh: desc,
              command_type: valueHint ? "option" : "flag",
              category: currentCategory,
              syntax: `opencode ${flagName}`.trim(),
              value_hint: valueHint,
              source_url: url.replace("/zh-cn/", "/"),
            });
          }
        } else {
          if (!entries.has(slug)) {
            entries.set(slug, {
              slug,
              name: flagName,
              description: desc,
              command_type: valueHint ? "option" : "flag",
              category: currentCategory,
              syntax: `opencode ${flagName}`.trim(),
              value_hint: valueHint,
              source_url: url,
            });
          }
        }
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
  log.info("Fetching all 4 pages in parallel...");
  const [cliEnHtml, cliZhHtml, tuiEnHtml, tuiZhHtml] = await Promise.all([
    fetchHtml("https://opencode.ai/docs/cli/"),
    fetchHtml("https://opencode.ai/docs/zh-cn/cli/"),
    fetchHtml("https://opencode.ai/docs/tui/"),
    fetchHtml("https://opencode.ai/docs/zh-cn/tui/"),
  ]);
  log.success("All pages fetched");

  // Parse EN pages first (base), then merge ZH on top
  const cliEn = parseCliPage(cliEnHtml, "https://opencode.ai/docs/cli/");
  log.info(`CLI en: ${cliEn.size} entries`);

  // Parse ZH page — it mutates cliEn entries to fill description_zh
  const cliZh = parseCliPage(cliZhHtml, "https://opencode.ai/docs/zh-cn/cli/");
  // Merge zh into en
  for (const [slug, zhEntry] of cliZh) {
    if (cliEn.has(slug)) {
      const en = cliEn.get(slug)!;
      if (!en.description_zh && zhEntry.description_zh) {
        en.description_zh = zhEntry.description_zh;
      } else if (!en.description_zh && zhEntry.description && zhEntry.description !== en.description) {
        // zh-only entry had description = zh text
        en.description_zh = zhEntry.description;
      }
    } else {
      cliEn.set(slug, zhEntry);
    }
  }
  log.info(`CLI merged: ${cliEn.size} entries`);

  const tuiEn = parseTuiPage(tuiEnHtml, "https://opencode.ai/docs/tui/");
  const tuiZh = parseTuiPage(tuiZhHtml, "https://opencode.ai/docs/zh-cn/tui/");
  log.info(`TUI en: ${tuiEn.size}, TUI zh: ${tuiZh.size}`);

  const commands: ScrapedCommand[] = [];

  for (const [slug, entry] of cliEn) {
    commands.push({
      name: entry.name,
      slug: entry.slug,
      command_type: entry.command_type,
      category: entry.category,
      description: entry.description,
      description_zh: entry.description_zh ?? null,
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
