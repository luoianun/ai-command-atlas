import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import type { ScrapedCommand, MatchResult } from "./types.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "ai_command_atlas",
      connectionLimit: 5,
      charset: "utf8mb4",
      timezone: "+00:00",
    });
  }
  return pool;
}

export async function getToolBySlug(
  slug: string
): Promise<{ id: number; slug: string; name: string } | null> {
  const [rows] = await getPool().query<any[]>(
    "SELECT id, slug, name FROM tools WHERE slug = ?",
    [slug]
  );
  return rows[0] ?? null;
}

export async function getCommandsByToolId(
  toolId: number,
  untranslatedOnly = false
): Promise<
  Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    last_checked: string;
  }>
> {
  const where = untranslatedOnly
    ? `tool_id = ? AND (description_zh IS NULL OR description_zh = '')`
    : `tool_id = ?`;
  const [rows] = await getPool().query<any[]>(
    `SELECT id, slug, name, description, last_checked FROM commands WHERE ${where}`,
    [toolId]
  );
  return rows.map((r: any) => ({
    ...r,
    last_checked:
      r.last_checked instanceof Date
        ? r.last_checked.toISOString().slice(0, 10)
        : String(r.last_checked ?? ""),
  }));
}

export async function matchCommands(
  toolId: number,
  scraped: ScrapedCommand[],
  force = false
): Promise<MatchResult> {
  const dbCommands = await getCommandsByToolId(toolId);
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const matched: MatchResult["matched"] = [];
  const usedDbIds = new Set<number>();

  for (const sc of scraped) {
    const bySlug = dbCommands.find(
      (d) => d.slug === sc.slug && !usedDbIds.has(d.id)
    );
    if (bySlug) {
      if (!force && bySlug.last_checked >= sevenDaysAgo) continue;
      matched.push({ scraped: sc, dbId: bySlug.id, dbSlug: bySlug.slug });
      usedDbIds.add(bySlug.id);
      continue;
    }

    const normalized = sc.name
      .replace(/^[-\/]+/, "")
      .toLowerCase()
      .trim();
    const byName = dbCommands.find(
      (d) =>
        !usedDbIds.has(d.id) &&
        d.name
          .replace(/^[-\/]+/, "")
          .toLowerCase()
          .trim() === normalized
    );
    if (byName) {
      if (!force && byName.last_checked >= sevenDaysAgo) continue;
      matched.push({ scraped: sc, dbId: byName.id, dbSlug: byName.slug });
      usedDbIds.add(byName.id);
    }
  }

  const matchedSlugs = new Set(matched.map((m) => m.scraped.slug));
  const unmatched = scraped.filter((sc) => !matchedSlugs.has(sc.slug));

  return { matched, unmatched };
}

export async function updateCommand(
  id: number,
  data: Partial<ScrapedCommand>
): Promise<void> {
  const sets: string[] = [];
  const values: any[] = [];

  if (data.description) {
    sets.push("description = ?");
    values.push(data.description);
  }
  if (data.syntax) {
    sets.push("syntax = ?");
    values.push(data.syntax);
  }
  if (data.parameters) {
    sets.push("parameters = ?");
    values.push(JSON.stringify(data.parameters));
  }
  if (data.examples) {
    sets.push("examples = ?");
    values.push(JSON.stringify(data.examples));
  }
  if (data.notes) {
    sets.push("notes = ?");
    values.push(JSON.stringify(data.notes));
  }
  if (data.caveats) {
    sets.push("caveats = ?");
    values.push(JSON.stringify(data.caveats));
  }
  if (data.source_url) {
    sets.push("source_url = ?");
    values.push(data.source_url);
  }

  sets.push("source_note = ?");
  values.push("Scraped from official documentation.");
  sets.push("last_checked = CURDATE()");

  if (sets.length === 0) return;

  values.push(id);
  await getPool().query(
    `UPDATE commands SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
}

export async function insertCommand(
  toolId: number,
  cmd: ScrapedCommand
): Promise<void> {
  await getPool().query(
    `INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, parameters, examples, notes, caveats, source_url, source_note, last_checked)
     VALUES (?, ?, ?, ?, ?, ?, 'official', ?, ?, ?, ?, ?, ?, ?, ?, 'Scraped from official documentation.', CURDATE())`,
    [
      toolId,
      cmd.slug,
      cmd.name,
      cmd.command_type,
      cmd.category,
      cmd.risk_level || "low",
      cmd.description,
      cmd.syntax,
      cmd.value_hint,
      cmd.parameters ? JSON.stringify(cmd.parameters) : null,
      cmd.examples ? JSON.stringify(cmd.examples) : null,
      cmd.notes ? JSON.stringify(cmd.notes) : null,
      cmd.caveats ? JSON.stringify(cmd.caveats) : null,
      cmd.source_url,
    ]
  );
}

export async function updateTranslations(
  toolId: number,
  translations: Map<
    string,
    {
      description_zh: string;
      notes_zh?: string[];
      caveats_zh?: string[];
    }
  >
): Promise<void> {
  for (const [slug, t] of translations) {
    const sets: string[] = [];
    const values: any[] = [];

    sets.push("description_zh = ?");
    values.push(t.description_zh);

    if (t.notes_zh) {
      sets.push("notes_zh = ?");
      values.push(JSON.stringify(t.notes_zh));
    }
    if (t.caveats_zh) {
      sets.push("caveats_zh = ?");
      values.push(JSON.stringify(t.caveats_zh));
    }

    values.push(toolId, slug);
    await getPool().query(
      `UPDATE commands SET ${sets.join(", ")} WHERE tool_id = ? AND slug = ?`,
      values
    );
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
