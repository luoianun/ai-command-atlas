import fs from "fs/promises";
import path from "path";
import type { ScrapedCommand, TranslatedFields } from "./types.js";

function sqlEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateEnrichmentSql(
  toolSlug: string,
  commands: Array<{ slug: string; data: Partial<ScrapedCommand> }>
): string {
  const lines: string[] = [
    `-- Enrichment data for ${toolSlug}`,
    `-- Generated: ${today()}`,
    `SET @tool = (SELECT id FROM tools WHERE slug = '${sqlEscape(toolSlug)}');`,
    "",
  ];

  for (const cmd of commands) {
    const sets: string[] = [];

    if (cmd.data.description) {
      sets.push(`  description = '${sqlEscape(cmd.data.description)}'`);
    }
    if (cmd.data.syntax) {
      sets.push(`  syntax = '${sqlEscape(cmd.data.syntax)}'`);
    }
    if (cmd.data.notes && cmd.data.notes.length > 0) {
      const items = cmd.data.notes.map((n) => `'${sqlEscape(n)}'`).join(", ");
      sets.push(`  notes = JSON_ARRAY(${items})`);
    }
    if (cmd.data.caveats && cmd.data.caveats.length > 0) {
      const items = cmd.data.caveats
        .map((c) => `'${sqlEscape(c)}'`)
        .join(", ");
      sets.push(`  caveats = JSON_ARRAY(${items})`);
    }
    if (cmd.data.examples && cmd.data.examples.length > 0) {
      const items = cmd.data.examples
        .map(
          (ex) =>
            `JSON_OBJECT('label', '${sqlEscape(ex.label)}', 'lang', '${sqlEscape(ex.lang)}', 'code', '${sqlEscape(ex.code)}')`
        )
        .join(",\n    ");
      sets.push(`  examples = JSON_ARRAY(\n    ${items}\n  )`);
    }
    if (cmd.data.parameters && cmd.data.parameters.length > 0) {
      const items = cmd.data.parameters
        .map(
          (p) =>
            `JSON_OBJECT('name', '${sqlEscape(p.name)}', 'type', '${sqlEscape(p.type)}', 'description', '${sqlEscape(p.description)}')`
        )
        .join(",\n    ");
      sets.push(`  parameters = JSON_ARRAY(\n    ${items}\n  )`);
    }
    if (cmd.data.source_url) {
      sets.push(`  source_url = '${sqlEscape(cmd.data.source_url)}'`);
    }

    sets.push(`  source_note = 'Scraped from official documentation.'`);
    sets.push(`  last_checked = '${today()}'`);

    if (sets.length > 0) {
      lines.push(`UPDATE commands SET`);
      lines.push(sets.join(",\n"));
      lines.push(
        `WHERE tool_id = @tool AND slug = '${sqlEscape(cmd.slug)}';`
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generateTranslationSql(
  toolSlug: string,
  translations: Map<string, TranslatedFields>
): string {
  const lines: string[] = [
    `-- Translations for ${toolSlug}`,
    `-- Generated: ${today()}`,
    `SET @tool = (SELECT id FROM tools WHERE slug = '${sqlEscape(toolSlug)}');`,
    "",
  ];

  // description_zh via CASE
  const descCases: string[] = [];
  for (const [slug, t] of translations) {
    descCases.push(
      `  WHEN '${sqlEscape(slug)}' THEN '${sqlEscape(t.description_zh)}'`
    );
  }
  if (descCases.length > 0) {
    lines.push(`UPDATE commands SET description_zh = CASE slug`);
    lines.push(descCases.join("\n"));
    lines.push(`END`);
    lines.push(`WHERE tool_id = @tool;`);
    lines.push("");
  }

  // notes_zh and caveats_zh as individual UPDATEs
  for (const [slug, t] of translations) {
    const sets: string[] = [];
    if (t.notes_zh && t.notes_zh.length > 0) {
      const items = t.notes_zh.map((n) => `'${sqlEscape(n)}'`).join(", ");
      sets.push(`  notes_zh = JSON_ARRAY(${items})`);
    }
    if (t.caveats_zh && t.caveats_zh.length > 0) {
      const items = t.caveats_zh.map((c) => `'${sqlEscape(c)}'`).join(", ");
      sets.push(`  caveats_zh = JSON_ARRAY(${items})`);
    }
    if (sets.length > 0) {
      lines.push(`UPDATE commands SET`);
      lines.push(sets.join(",\n"));
      lines.push(
        `WHERE tool_id = @tool AND slug = '${sqlEscape(slug)}';`
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generateDiscoveryReport(
  toolSlug: string,
  unmatched: ScrapedCommand[]
): string {
  if (unmatched.length === 0) return "";

  const lines: string[] = [
    `-- ============================================`,
    `-- NEW COMMANDS for ${toolSlug}`,
    `-- ${unmatched.length} commands to import`,
    `-- ============================================`,
    `SET @tool = (SELECT id FROM tools WHERE slug = '${sqlEscape(toolSlug)}');`,
    "",
  ];

  for (const cmd of unmatched) {
    const slug = sqlEscape(cmd.slug);
    const name = sqlEscape(cmd.name);
    const desc = sqlEscape(cmd.description);
    const syntax = cmd.syntax ? `'${sqlEscape(cmd.syntax)}'` : "NULL";
    const valueHint = cmd.value_hint ? `'${sqlEscape(cmd.value_hint)}'` : "NULL";
    const sourceUrl = cmd.source_url ? `'${sqlEscape(cmd.source_url)}'` : "NULL";
    const risk = cmd.risk_level || "low";

    let extraSets = "";

    if (cmd.notes && cmd.notes.length > 0) {
      const items = cmd.notes.map((n) => `'${sqlEscape(n)}'`).join(", ");
      extraSets += `,\n  JSON_ARRAY(${items})`;
    } else {
      extraSets += ",\n  NULL";
    }

    if (cmd.caveats && cmd.caveats.length > 0) {
      const items = cmd.caveats.map((c) => `'${sqlEscape(c)}'`).join(", ");
      extraSets += `,\n  JSON_ARRAY(${items})`;
    } else {
      extraSets += ",\n  NULL";
    }

    if (cmd.examples && cmd.examples.length > 0) {
      const items = cmd.examples
        .map(
          (ex) =>
            `JSON_OBJECT('label', '${sqlEscape(ex.label)}', 'lang', '${sqlEscape(ex.lang)}', 'code', '${sqlEscape(ex.code)}')`
        )
        .join(",\n    ");
      extraSets += `,\n  JSON_ARRAY(\n    ${items}\n  )`;
    } else {
      extraSets += ",\n  NULL";
    }

    if (cmd.parameters && cmd.parameters.length > 0) {
      const items = cmd.parameters
        .map(
          (p) =>
            `JSON_OBJECT('name', '${sqlEscape(p.name)}', 'type', '${sqlEscape(p.type)}', 'description', '${sqlEscape(p.description)}')`
        )
        .join(",\n    ");
      extraSets += `,\n  JSON_ARRAY(\n    ${items}\n  )`;
    } else {
      extraSets += ",\n  NULL";
    }

    lines.push(
      `INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, source_url, source_note, last_checked, notes, caveats, examples, parameters) VALUES`
    );
    lines.push(
      `(@tool, '${slug}', '${name}', '${cmd.command_type}', '${sqlEscape(cmd.category)}', '${risk}', 'official', '${desc}', ${syntax}, ${valueHint}, ${sourceUrl}, 'Scraped from official documentation.', '${today()}',`
    );
    lines.push(`  ${extraSets.replace(/^,\n  /, "")});`);
    lines.push("");
  }

  return lines.join("\n");
}

export async function writeSqlFile(
  outputDir: string,
  toolSlug: string,
  content: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${toolSlug}.sql`);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}
