import path from "path";
import dotenv from "dotenv";
import type { ScrapedCommand, RunOptions } from "./lib/types.js";
import { createLogger } from "./lib/logger.js";
import * as db from "./lib/db.js";
import * as sql from "./lib/sql-generator.js";
import { translateBatch } from "./lib/translator.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const log = createLogger("runner");

const TOOL_SLUGS = ["aider", "gemini-cli", "opencode", "claude-code", "codex-cli", "goose", "cline", "kiro", "gh-copilot", "qoder", "trae", "kilo-code"];

type ScraperModule = { scrape: () => Promise<ScrapedCommand[]> };

const scraperMap: Record<string, () => Promise<ScraperModule>> = {
  aider: () => import("./aider.js"),
  "gemini-cli": () => import("./gemini-cli.js"),
  opencode: () => import("./opencode.js"),
  "claude-code": () => import("./claude-code.js"),
  "codex-cli": () => import("./codex-cli.js"),
  goose: () => import("./goose.js"),
  cline: () => import("./cline.js"),
  kiro: () => import("./kiro.js"),
  "gh-copilot": () => import("./gh-copilot.js"),
  qoder: () => import("./qoder.js"),
  trae: () => import("./trae.js"),
  "kilo-code": () => import("./kilo-code.js"),
};

function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const opts: RunOptions = {
    tools: [],
    translate: false,
    translateOnly: false,
    dryRun: false,
    force: false,
    outputDir: path.resolve(process.cwd(), "scripts/scrapers/output"),
  };

  for (const arg of args) {
    if (arg === "--translate") opts.translate = true;
    else if (arg === "--translate-only") {
      opts.translateOnly = true;
      opts.translate = true;
    } else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--force") opts.force = true;
    else if (arg.startsWith("--output-dir="))
      opts.outputDir = arg.split("=")[1];
    else if (arg === "all") opts.tools = [...TOOL_SLUGS];
    else if (TOOL_SLUGS.includes(arg)) opts.tools.push(arg);
    else {
      log.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  if (opts.tools.length === 0) {
    log.error("No tool specified. Use a tool name or 'all'.");
    printUsage();
    process.exit(1);
  }

  return opts;
}

function printUsage() {
  process.stderr.write(`
Usage: npx tsx scripts/scrapers/run.ts [options] [tool|all]

Tools: ${TOOL_SLUGS.join(", ")}

Options:
  --translate        Run translation after scraping
  --translate-only   Skip scraping, only translate existing DB data
  --dry-run          Generate SQL only, don't write to DB
  --force            Ignore last_checked, re-scrape everything
  --output-dir=DIR   Custom output dir (default: scripts/scrapers/output/)

Examples:
  npx tsx scripts/scrapers/run.ts aider
  npx tsx scripts/scrapers/run.ts all --translate
  npx tsx scripts/scrapers/run.ts aider --dry-run
`);
}

interface Summary {
  tool: string;
  matched: number;
  enriched: number;
  inserted: number;
  newFound: number;
  translated: number;
}

async function main() {
  const opts = parseArgs();
  const summaries: Summary[] = [];

  log.info(
    `Running scrapers for: ${opts.tools.join(", ")}${opts.dryRun ? " [DRY RUN]" : ""}`
  );

  for (const toolSlug of opts.tools) {
    const summary: Summary = {
      tool: toolSlug,
      matched: 0,
      enriched: 0,
      inserted: 0,
      newFound: 0,
      translated: 0,
    };

    try {
      const tool = await db.getToolBySlug(toolSlug);
      if (!tool) {
        log.error(`Tool '${toolSlug}' not found in database. Skipping.`);
        summaries.push(summary);
        continue;
      }

      let scraped: ScrapedCommand[] = [];
      let sqlContent = "";

      if (!opts.translateOnly) {
        // Scrape
        const scraperLoader = scraperMap[toolSlug];
        if (!scraperLoader) {
          log.error(`No scraper for '${toolSlug}'. Skipping.`);
          summaries.push(summary);
          continue;
        }

        const scraper = await scraperLoader();
        log.info(`Scraping ${toolSlug}...`);
        scraped = await scraper.scrape();
        log.success(`Scraped ${scraped.length} commands from ${toolSlug}`);

        // Match against DB
        const result = await db.matchCommands(tool.id, scraped, opts.force);
        summary.matched = result.matched.length;
        summary.newFound = result.unmatched.length;

        // Enrich matched commands
        if (!opts.dryRun) {
          for (const m of result.matched) {
            await db.updateCommand(m.dbId, m.scraped);
            summary.enriched++;
          }
          log.success(`Enriched ${summary.enriched} commands in DB`);

          // Insert new commands
          let inserted = 0;
          for (const cmd of result.unmatched) {
            try {
              await db.insertCommand(tool.id, cmd);
              inserted++;
            } catch (err: any) {
              if (err.code === "ER_DUP_ENTRY") continue;
              log.warn(`Failed to insert ${cmd.slug}: ${err.message}`);
            }
          }
          if (inserted > 0) {
            log.success(`Inserted ${inserted} new commands into DB`);
            summary.inserted = inserted;
          }
        }

        // Generate SQL
        const enrichData = result.matched.map((m) => ({
          slug: m.dbSlug,
          data: m.scraped,
        }));
        sqlContent += sql.generateEnrichmentSql(toolSlug, enrichData);
        sqlContent += "\n";
        sqlContent += sql.generateDiscoveryReport(toolSlug, result.unmatched);

        if (result.unmatched.length > 0) {
          log.warn(
            `${result.unmatched.length} new commands discovered (not in DB):`
          );
          for (const u of result.unmatched.slice(0, 10)) {
            log.warn(`  NEW: ${u.name} (${u.command_type}) - ${u.description.slice(0, 60)}...`);
          }
          if (result.unmatched.length > 10) {
            log.warn(`  ... and ${result.unmatched.length - 10} more`);
          }
        }
      }

      // Translation — only process commands that don't have description_zh yet
      if (opts.translate) {
        const dbUntranslated = await db.getCommandsByToolId(tool.id, true);

        const translateInput = dbUntranslated
          .filter((c: any) => c.description)
          .map((c: any) => ({
            slug: c.slug,
            description: c.description,
            notes: (c as any).notes || undefined,
            caveats: (c as any).caveats || undefined,
          }));

        log.info(`Translating ${translateInput.length} commands...`);
        const translations = await translateBatch(translateInput);
        summary.translated = translations.size;

        if (!opts.dryRun) {
          await db.updateTranslations(tool.id, translations);
          log.success(`Updated ${translations.size} translations in DB`);
        }

        sqlContent += "\n";
        sqlContent += sql.generateTranslationSql(toolSlug, translations);
      }

      // Write SQL file
      if (sqlContent.trim()) {
        const filePath = await sql.writeSqlFile(
          opts.outputDir,
          toolSlug,
          sqlContent
        );
        log.success(`SQL written to ${filePath}`);
      }
    } catch (err: any) {
      log.error(`Failed for ${toolSlug}: ${err.message}`);
      if (err.stack) log.error(err.stack);
    }

    summaries.push(summary);
  }

  // Print summary table
  process.stderr.write("\n");
  process.stderr.write(
    "┌──────────────┬─────────┬──────────┬──────────┬────────────┐\n"
  );
  process.stderr.write(
    "│ Tool         │ Matched │ Enriched │ Inserted │ Translated │\n"
  );
  process.stderr.write(
    "├──────────────┼─────────┼──────────┼──────────┼────────────┤\n"
  );
  for (const s of summaries) {
    const t = s.tool.padEnd(12);
    const m = String(s.matched).padStart(7);
    const e = String(s.enriched).padStart(8);
    const ins = String(s.inserted).padStart(8);
    const tr = String(s.translated).padStart(10);
    process.stderr.write(`│ ${t} │${m} │${e} │${ins} │${tr} │\n`);
  }
  process.stderr.write(
    "└──────────────┴─────────┴──────────┴──────────┴────────────┘\n"
  );

  await db.closePool();
  log.success("Done!");
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
