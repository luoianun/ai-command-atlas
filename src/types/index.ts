// src/types/index.ts

export type RiskLevel = "low" | "medium" | "high";
export type SourceType = "official" | "github" | "community";
export type CommandType = "option" | "slash" | "subcommand" | "flag" | "config";

export interface Tool {
  id: number;
  slug: string;
  name: string;
  company: string;
  description: string;
  description_zh: string | null;
  color: string;
  avatar: string;
  version: string;
  source_type: SourceType;
  github_url: string | null;
  docs_url: string | null;
  command_count?: number;
}

export interface CommandParameter {
  name: string;
  type: string;
  description: string;
}

export interface CommandExample {
  label?: string;
  lang: string;
  code: string;
}

export interface Command {
  id: number;
  tool_id: number;
  tool_slug: string;
  tool_name: string;
  tool_color: string;
  slug: string;
  name: string;
  command_type: CommandType;
  category: string;
  risk_level: RiskLevel;
  source: SourceType;
  description: string;
  description_zh: string | null;
  syntax: string | null;
  value_hint: string | null;
  parameters: CommandParameter[] | null;
  examples: CommandExample[] | null;
  notes: string[] | null;
  notes_zh: string[] | null;
  caveats: string[] | null;
  caveats_zh: string[] | null;
  source_url: string | null;
  source_note: string | null;
  last_checked: string;
  related_command_ids: number[] | null;
}

export interface SearchResult {
  id: number;
  slug: string;
  name: string;
  tool_slug: string;
  tool_name: string;
  description: string;
  description_zh: string | null;
  category: string;
  risk_level: RiskLevel;
}

export interface CompareCapability {
  id: number;
  capability: string;
  capability_zh: string | null;
  capability_desc: string;
  capability_desc_zh: string | null;
  category: string;
  sort_order: number;
}

export interface CompareEntry {
  id: number;
  capability_id: number;
  tool_id: number;
  tool_slug: string;
  tool_name: string;
  tool_color: string;
  has_feature: boolean;
  command_name: string | null;
  command_slug: string | null;
  command_desc: string | null;
  command_desc_zh: string | null;
  none_label: string | null;
  none_label_zh: string | null;
  risk_level: RiskLevel | null;
  source: SourceType | null;
  copy_text: string | null;
}

export interface Stats {
  cli_count: number;
  command_count: number;
  slash_count: number;
  official_count: number;
}
