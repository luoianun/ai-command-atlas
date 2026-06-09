// src/lib/queries.ts
import pool from "./db";
import type { Tool, Command, SearchResult, Stats, CompareCapability, CompareEntry } from "@/types";

export async function getTools(): Promise<Tool[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT t.*, COUNT(c.id) as command_count
     FROM tools t LEFT JOIN commands c ON c.tool_id = t.id
     GROUP BY t.id ORDER BY t.id`
  );
  return rows;
}

export async function getToolBySlug(slug: string): Promise<Tool | null> {
  const [rows] = await pool.query<any[]>(
    `SELECT t.*, COUNT(c.id) as command_count
     FROM tools t LEFT JOIN commands c ON c.tool_id = t.id
     WHERE t.slug = ? GROUP BY t.id`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getCommandsByTool(toolSlug: string): Promise<Command[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT c.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM commands c JOIN tools t ON t.id = c.tool_id
     WHERE t.slug = ? ORDER BY c.command_type, c.name`,
    [toolSlug]
  );
  return rows.map(parseCommandJson);
}

export async function getCommandBySlug(toolSlug: string, commandSlug: string): Promise<Command | null> {
  const [rows] = await pool.query<any[]>(
    `SELECT c.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM commands c JOIN tools t ON t.id = c.tool_id
     WHERE t.slug = ? AND c.slug = ?`,
    [toolSlug, commandSlug]
  );
  return rows[0] ? parseCommandJson(rows[0]) : null;
}

export async function getRecentCommands(limit = 10): Promise<Command[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT c.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM commands c JOIN tools t ON t.id = c.tool_id
     ORDER BY c.updated_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map(parseCommandJson);
}

export async function searchCommands(q: string, toolSlug?: string): Promise<SearchResult[]> {
  const like = `%${q}%`;
  const prefix = `${q}%`;
  // Weighted relevance: exact name > prefix name > name contains > description contains
  const params: any[] = [q, prefix, like, like, like];
  let sql = `SELECT c.id, c.slug, c.name, c.description, c.description_zh, c.category, c.risk_level,
               t.slug as tool_slug, t.name as tool_name,
               CASE
                 WHEN LOWER(c.name) = LOWER(?) THEN 4
                 WHEN LOWER(c.name) LIKE LOWER(?) THEN 3
                 WHEN c.name LIKE ? THEN 2
                 WHEN c.description LIKE ? OR c.description_zh LIKE ? THEN 1
                 ELSE 0
               END AS relevance
             FROM commands c JOIN tools t ON t.id = c.tool_id
             WHERE (c.name LIKE ? OR c.description LIKE ? OR c.description_zh LIKE ?)`;
  params.push(like, like, like);
  if (toolSlug && toolSlug !== "all") {
    sql += ` AND t.slug = ?`;
    params.push(toolSlug);
  }
  sql += ` ORDER BY relevance DESC, c.name LIMIT 20`;
  const [rows] = await pool.query<any[]>(sql, params);
  return rows;
}

export async function suggestCommands(q: string, toolSlug?: string): Promise<{ name: string; tool_name: string; tool_slug: string; slug: string }[]> {
  const prefix = `${q}%`;
  const like = `%${q}%`;
  const params: any[] = [prefix, like];
  let sql = `SELECT c.slug, c.name, t.slug as tool_slug, t.name as tool_name
             FROM commands c JOIN tools t ON t.id = c.tool_id
             WHERE (c.name LIKE ? OR c.name LIKE ?)`;
  if (toolSlug && toolSlug !== "all") {
    sql += ` AND t.slug = ?`;
    params.push(toolSlug);
  }
  sql += ` ORDER BY CASE WHEN c.name LIKE ? THEN 0 ELSE 1 END, c.name LIMIT 8`;
  params.push(prefix);
  const [rows] = await pool.query<any[]>(sql, params);
  return rows;
}

export async function getStats(): Promise<Stats> {
  const [rows] = await pool.query<any[]>(
    `SELECT
       (SELECT COUNT(*) FROM tools) as cli_count,
       (SELECT COUNT(*) FROM commands) as command_count,
       (SELECT COUNT(*) FROM commands WHERE command_type = 'slash') as slash_count,
       (SELECT COUNT(*) FROM commands WHERE source = 'official') as official_count`
  );
  return rows[0];
}

export async function getCategoryStats(): Promise<{ category: string; count: number }[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT category, COUNT(*) as count FROM commands GROUP BY category ORDER BY count DESC`
  );
  return rows;
}

export async function getCompareData(category: string): Promise<{
  capabilities: CompareCapability[];
  entries: CompareEntry[];
  tools: Tool[];
}> {
  const [caps] = await pool.query<any[]>(
    `SELECT * FROM compare_capabilities WHERE category = ? ORDER BY sort_order`,
    [category]
  );
  const [entries] = await pool.query<any[]>(
    `SELECT ce.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM compare_entries ce JOIN tools t ON t.id = ce.tool_id
     WHERE ce.capability_id IN (SELECT id FROM compare_capabilities WHERE category = ?)
     ORDER BY ce.capability_id, t.id`,
    [category]
  );
  const tools = await getTools();
  return { capabilities: caps, entries, tools };
}

export async function getAllCommands(filters?: {
  category?: string;
  tool?: string;
  risk?: string;
  q?: string;
}): Promise<Command[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters?.category) { conditions.push("c.category = ?"); params.push(filters.category); }
  if (filters?.tool && filters.tool !== "all") { conditions.push("t.slug = ?"); params.push(filters.tool); }
  if (filters?.risk) { conditions.push("c.risk_level = ?"); params.push(filters.risk); }
  if (filters?.q) { conditions.push("(c.name LIKE ? OR c.description LIKE ?)"); params.push(`%${filters.q}%`, `%${filters.q}%`); }
  let sql = `SELECT c.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM commands c JOIN tools t ON t.id = c.tool_id`;
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY c.category, c.name";
  const [rows] = await pool.query<any[]>(sql, params);
  return rows.map(parseCommandJson);
}

export async function getSimilarCommands(name: string, toolId: number): Promise<Command[]> {
  const [rows] = await pool.query<any[]>(
    `SELECT c.*, t.slug as tool_slug, t.name as tool_name, t.color as tool_color
     FROM commands c JOIN tools t ON t.id = c.tool_id
     WHERE c.name = ? AND c.tool_id != ?
     LIMIT 5`,
    [name, toolId]
  );
  return rows.map(parseCommandJson);
}

function safeJsonParse<T>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

function parseCommandJson(row: any): Command {
  return {
    ...row,
    parameters: safeJsonParse(row.parameters),
    examples: safeJsonParse(row.examples),
    notes: safeJsonParse(row.notes),
    notes_zh: safeJsonParse(row.notes_zh),
    caveats: safeJsonParse(row.caveats),
    caveats_zh: safeJsonParse(row.caveats_zh),
    related_command_ids: safeJsonParse(row.related_command_ids),
    last_checked: row.last_checked instanceof Date
      ? row.last_checked.toISOString().slice(0, 10)
      : String(row.last_checked ?? ""),
  };
}
