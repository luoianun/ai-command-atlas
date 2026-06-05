import type { ScrapedCommand, ScraperConfig } from "./lib/types.js";
import { fetchWithPlaywright, parseHtml, sleep } from "./lib/fetcher.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("codex-cli");

const DOCS_BASE = "https://developers.openai.com/codex";

const config: ScraperConfig = {
  toolSlug: "codex-cli",
  toolName: "Codex CLI",
  sources: [
    { url: `${DOCS_BASE}/cli`, type: "html", label: "CLI usage" },
    { url: `${DOCS_BASE}/cli/slash-commands`, type: "html", label: "Slash commands" },
    { url: `${DOCS_BASE}/config-reference`, type: "html", label: "Config reference" },
    { url: `${DOCS_BASE}/config-basic`, type: "html", label: "Config basics" },
  ],
  slugify: (name: string) =>
    name
      .replace(/^[-\/]+/, "")
      .replace(/\s+.*$/, "")
      .replace(/\s+/g, "-")
      .toLowerCase(),
};

export { config };

export async function scrape(): Promise<ScrapedCommand[]> {
  const commands: ScrapedCommand[] = [];
  const existingSlugs = new Set<string>();

  // 1. CLI page: extract flags from code blocks and headings
  try {
    log.info(`Fetching ${config.sources[0].url} with Playwright...`);
    const html = await fetchWithPlaywright(config.sources[0].url, "h1");
    const $ = parseHtml(html);

    // Extract code elements that look like CLI flags
    const flagsFromCode = new Set<string>();
    $("code").each((_, el) => {
      const text = $(el).text().trim();
      if (text.startsWith("--") && !text.includes(" ")) {
        flagsFromCode.add(text);
      }
      if (text.startsWith("codex ")) {
        const match = text.match(/(--[\w-]+)/g);
        if (match) match.forEach((f) => flagsFromCode.add(f));
      }
    });

    // Extract sections as contextual commands
    $("h3").each((_, el) => {
      const $el = $(el);
      const heading = $el.text().replace(/\s+/g, " ").trim();

      const descParts: string[] = [];
      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3")) {
        if (sibling.is("p")) {
          descParts.push(sibling.text().replace(/\s+/g, " ").trim());
        }
        sibling = sibling.next();
      }

      if (heading.includes("Approval modes")) {
        addIfNew(commands, existingSlugs, {
          name: "--approval-mode",
          slug: "approval-mode",
          command_type: "option",
          category: "Permission",
          description: descParts.join(" ") || "Control how Codex requests approval for actions.",
          syntax: "codex --approval-mode <mode>",
          value_hint: "suggest|auto-edit|full-auto",
          source_url: `${DOCS_BASE}/cli`,
          risk_level: "medium",
        });
      }
      if (heading.includes("Model Context Protocol")) {
        addIfNew(commands, existingSlugs, {
          name: "mcp",
          slug: "mcp",
          command_type: "subcommand",
          category: "MCP",
          description: descParts.join(" ") || "Configure Model Context Protocol servers.",
          syntax: "codex mcp",
          value_hint: null,
          source_url: `${DOCS_BASE}/cli`,
          risk_level: "low",
        });
      }
    });

    log.success(`CLI page: ${commands.length} commands, ${flagsFromCode.size} flags found`);
    await sleep(1000);
  } catch (err: any) {
    log.error(`CLI page failed: ${err.message}`);
  }

  // 2. Slash commands page: table with Command, Purpose, When to use it
  try {
    log.info(`Fetching ${config.sources[1].url} with Playwright...`);
    const html = await fetchWithPlaywright(config.sources[1].url, "table");
    const $ = parseHtml(html);

    $("table").each((_, table) => {
      const $table = $(table);
      const headers = $table
        .find("th")
        .map((__, th) => $(th).text().trim().toLowerCase())
        .get();

      if (!headers.includes("command") && !headers.includes("purpose")) return;

      $table.find("tbody tr, tr:not(:first-child)").each((__, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const rawName = $(cells[0]).text().trim();
        const purpose = $(cells[1]).text().trim();
        const whenToUse = cells.length > 2 ? $(cells[2]).text().trim() : "";

        if (!rawName.startsWith("/")) return;

        const name = rawName.split(/\s+/)[0];
        const slug = config.slugify(name);
        if (existingSlugs.has(slug)) return;

        const desc = whenToUse ? `${purpose} ${whenToUse}` : purpose;

        addIfNew(commands, existingSlugs, {
          name,
          slug,
          command_type: "slash",
          category: inferSlashCategory(name, desc),
          description: desc,
          syntax: name,
          value_hint: null,
          source_url: `${DOCS_BASE}/cli/slash-commands`,
          risk_level: inferRisk(name, desc),
        });
      });
    });

    // Also extract from h3 headings (each slash command has a section)
    $("h3").each((_, el) => {
      const $el = $(el);
      const heading = $el.text().replace(/\s+/g, " ").trim();
      const match = heading.match(/\/([\w-]+)/);
      if (!match) return;

      const name = `/${match[1]}`;
      const slug = config.slugify(name);
      if (existingSlugs.has(slug)) return;

      const descParts: string[] = [];
      let sibling = $el.next();
      while (sibling.length && !sibling.is("h2, h3")) {
        if (sibling.is("p")) {
          descParts.push(sibling.text().replace(/\s+/g, " ").trim());
        }
        sibling = sibling.next();
      }

      const description = descParts.join(" ").trim();
      if (!description) return;

      addIfNew(commands, existingSlugs, {
        name,
        slug,
        command_type: "slash",
        category: inferSlashCategory(name, description),
        description,
        syntax: name,
        value_hint: null,
        source_url: `${DOCS_BASE}/cli/slash-commands`,
        risk_level: inferRisk(name, description),
      });
    });

    log.success(`After slash commands: ${commands.length} total`);
    await sleep(1000);
  } catch (err: any) {
    log.error(`Slash commands page failed: ${err.message}`);
  }

  // 3. Config reference: the big table
  try {
    log.info(`Fetching ${config.sources[2].url} with Playwright...`);
    const html = await fetchWithPlaywright(config.sources[2].url, "table");
    const $ = parseHtml(html);

    $("table").each((_, table) => {
      const $table = $(table);
      const headers = $table
        .find("th")
        .map((__, th) => $(th).text().trim().toLowerCase())
        .get();

      if (!headers.includes("key")) return;

      $table.find("tbody tr, tr:not(:first-child)").each((__, row) => {
        const cells = $(row).find("td");
        if (cells.length < 3) return;

        const key = $(cells[0]).text().trim();
        const typeOrValues = $(cells[1]).text().trim();
        const details = $(cells[2]).text().trim();

        if (!key || !details) return;
        if (key.includes("<name>")) return; // template keys like agents.<name>.xxx

        const slug = key.replace(/\./g, "-").replace(/_/g, "-").toLowerCase();
        if (existingSlugs.has(slug)) return;

        addIfNew(commands, existingSlugs, {
          name: key,
          slug,
          command_type: "config",
          category: inferCategory(key, details),
          description: details,
          syntax: `${key} = ${typeOrValues}`,
          value_hint: typeOrValues,
          source_url: `${DOCS_BASE}/config-reference`,
          risk_level: inferRisk(key, details),
        });
      });
    });

    log.success(`Config reference: ${commands.length} total commands`);
    await sleep(1000);
  } catch (err: any) {
    log.error(`Config reference failed: ${err.message}`);
  }

  // 4. Config basics: feature flags
  try {
    log.info(`Fetching ${config.sources[3].url} with Playwright...`);
    const html = await fetchWithPlaywright(config.sources[3].url, "table");
    const $ = parseHtml(html);

    $("table").each((_, table) => {
      const $table = $(table);
      const headers = $table
        .find("th")
        .map((__, th) => $(th).text().trim().toLowerCase())
        .get();

      if (!headers.includes("key") && !headers.includes("description")) return;

      $table.find("tbody tr, tr:not(:first-child)").each((__, row) => {
        const cells = $(row).find("td");
        if (cells.length < 2) return;

        const key = $(cells[0]).text().trim();
        const desc = $(cells[cells.length - 1]).text().trim();
        if (!key || !desc) return;

        const slug = `feature-${key.replace(/\s+/g, "-").toLowerCase()}`;
        if (existingSlugs.has(slug)) return;

        addIfNew(commands, existingSlugs, {
          name: `--enable ${key}`,
          slug,
          command_type: "flag",
          category: "Config",
          description: desc,
          syntax: `codex --enable ${key}`,
          value_hint: null,
          source_url: `${DOCS_BASE}/config-basic`,
          risk_level: "low",
        });
      });
    });

    log.success(`Total: ${commands.length} commands`);
  } catch (err: any) {
    log.error(`Config basics failed: ${err.message}`);
  }

  return commands;
}

function addIfNew(
  commands: ScrapedCommand[],
  existingSlugs: Set<string>,
  cmd: Omit<ScrapedCommand, "parameters" | "examples" | "notes" | "caveats">
) {
  if (existingSlugs.has(cmd.slug)) return;
  existingSlugs.add(cmd.slug);
  commands.push({
    ...cmd,
    parameters: null,
    examples: null,
    notes: null,
    caveats: null,
  });
}

function inferSlashCategory(name: string, desc: string): string {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("/fast")) return "Model";
  if (lower.includes("permission") || lower.includes("approval") || lower.includes("sandbox"))
    return "Permission";
  if (lower.includes("mcp") || lower.includes("plugin") || lower.includes("app") || lower.includes("hook"))
    return "MCP";
  if (lower.includes("compact") || lower.includes("resume") || lower.includes("clear") ||
      lower.includes("new") || lower.includes("fork") || lower.includes("side") ||
      lower.includes("diff") || lower.includes("review") || lower.includes("status"))
    return "Session";
  return "Config";
}

function inferCategory(key: string, desc: string): string {
  const lower = (key + " " + desc).toLowerCase();
  if (lower.includes("model") || lower.includes("temperature") || lower.includes("provider"))
    return "Model";
  if (lower.includes("approval") || lower.includes("sandbox") || lower.includes("permission"))
    return "Permission";
  if (lower.includes("mcp") || lower.includes("tool")) return "MCP";
  if (lower.includes("session") || lower.includes("history") || lower.includes("compact"))
    return "Session";
  return "Config";
}

function inferRisk(name: string, desc: string): "low" | "medium" | "high" {
  const lower = (name + " " + desc).toLowerCase();
  if (lower.includes("dangerously") || lower.includes("yolo") || lower.includes("skip"))
    return "high";
  if (lower.includes("approval") || lower.includes("sandbox") || lower.includes("auto"))
    return "medium";
  return "low";
}
