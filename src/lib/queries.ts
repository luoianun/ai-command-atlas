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
  const params: any[] = [`%${q}%`, `%${q}%`, `%${q}%`];
  let sql = `SELECT c.id, c.slug, c.name, c.description, c.category, c.risk_level,
               t.slug as tool_slug, t.name as tool_name
             FROM commands c JOIN tools t ON t.id = c.tool_id
             WHERE (c.name LIKE ? OR c.description LIKE ? OR c.category LIKE ?)`;
  if (toolSlug && toolSlug !== "all") {
    sql += ` AND t.slug = ?`;
    params.push(toolSlug);
  }
  sql += ` ORDER BY c.name LIMIT 20`;
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

function parseCommandJson(row: any): Command {
  return {
    ...row,
    parameters: row.parameters ? JSON.parse(row.parameters) : null,
    examples: row.examples ? JSON.parse(row.examples) : null,
    notes: row.notes ? JSON.parse(row.notes) : null,
    caveats: row.caveats ? JSON.parse(row.caveats) : null,
    related_command_ids: row.related_command_ids ? JSON.parse(row.related_command_ids) : null,
  };
}
