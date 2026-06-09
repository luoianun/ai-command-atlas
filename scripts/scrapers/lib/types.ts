export interface ScrapedCommand {
  name: string;
  slug: string;
  command_type: "option" | "slash" | "subcommand" | "flag" | "config";
  category: string;
  description: string;
  description_zh?: string | null;
  syntax: string | null;
  value_hint?: string | null;
  parameters?: ScrapedParameter[] | null;
  examples?: ScrapedExample[] | null;
  notes?: string[] | null;
  caveats?: string[] | null;
  source_url: string;
  risk_level?: "low" | "medium" | "high";
}

export interface ScrapedParameter {
  name: string;
  type: string;
  description: string;
}

export interface ScrapedExample {
  label: string;
  lang: string;
  code: string;
}

export interface ScraperConfig {
  toolSlug: string;
  toolName: string;
  sources: ScraperSource[];
  slugify: (name: string) => string;
}

export interface ScraperSource {
  url: string;
  type: "html" | "markdown" | "github-api";
  label: string;
}

export interface MatchResult {
  matched: Array<{
    scraped: ScrapedCommand;
    dbId: number;
    dbSlug: string;
  }>;
  unmatched: ScrapedCommand[];
}

export interface RunOptions {
  tools: string[];
  translate: boolean;
  translateOnly: boolean;
  dryRun: boolean;
  force: boolean;
  outputDir: string;
}

export interface TranslatedFields {
  description_zh: string;
  notes_zh?: string[];
  caveats_zh?: string[];
}
