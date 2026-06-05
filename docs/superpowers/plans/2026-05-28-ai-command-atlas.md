# ai-command-atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack AI CLI command reference website with Next.js 15, MySQL, and pixel-faithful implementation of the provided HTML designs.

**Architecture:** Next.js 15 App Router with Server Components for data-fetched pages and Client Components for interactive UI (search, filters, tabs, theme toggle). MySQL with `mysql2/promise` stores all command data. Tailwind CSS maps to design tokens from HTML prototypes.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, mysql2/promise, MySQL 8+

---

## Design Tokens (extracted from prototype HTML)

```css
/* Light mode (default) */
--bg: #ffffff        --surface: #fafafa    --fg: #09090b
--muted: #71717a     --border: #e4e4e7     --border-light: #f4f4f5
--accent: #2563eb    --accent-hover: #1d4ed8   --accent-bg: #eff6ff
--risk-low: #16a34a  --risk-low-bg: #f0fdf4
--risk-med: #d97706  --risk-med-bg: #fffbeb
--risk-high: #dc2626 --risk-high-bg: #fef2f2
--r: 6px             --code-bg: #18181b

/* Dark mode ([data-theme="dark"]) */
--bg: #09090b        --surface: #111113    --fg: #fafafa
--muted: #a1a1aa     --border: #27272a     --border-light: #1c1c1f
--accent: #60a5fa    --accent-hover: #93c5fd
--risk-low-bg: #052e16  --risk-low: #4ade80
--risk-med-bg: #1c1400  --risk-med: #fbbf24
--risk-high-bg: #2d0a0a --risk-high: #f87171

/* Tool colors (use these exact variable names in globals.css) */
--claude-color: #d97706    --codex-color: #16a34a     --gemini-color: #2563eb
--aider-color: #7c3aed     --oc-color: #0891b2

/* Fonts */
--sans: system-ui sans-serif stack
--mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace
```

## File Structure

```
src/
  app/
    layout.tsx                    # Root layout: Nav + Footer + theme provider
    page.tsx                      # Home / (search hero, stats, categories, command table, tool sidebar)
    globals.css                   # CSS variables + Tailwind base + typography reset
    tools/
      page.tsx                    # /tools — tool grid with filter
      [tool]/
        page.tsx                  # /tools/:tool — command table with tabs + filters
    commands/
      [tool]/
        [command]/
          page.tsx                # /commands/:tool/:command — command detail
    compare/
      page.tsx                    # /compare — side-by-side capability table
    api/
      search/route.ts             # GET /api/search?q=&tool= — full-text search
      stats/route.ts              # GET /api/stats — aggregate counts for home page
  components/
    nav.tsx                       # Sticky nav: logo, links, lang select, theme toggle, GitHub (client)
    footer.tsx                    # Footer: copyright, links
    badge.tsx                     # Risk/source/type/category badge
    code-block.tsx                # Dark code block with header + copy button (client)
    search-bar.tsx                # Search input + dropdown results (client)
    tool-chips.tsx                # Tool filter pill buttons (client)
    command-table.tsx             # Command table with tab + filter + risk filter (client)
    theme-toggle.tsx              # Sun/moon toggle (client)
    copy-button.tsx               # Reusable copy-to-clipboard (client)
  lib/
    db.ts                         # mysql2/promise pool singleton
    queries.ts                    # All DB query functions (typed)
  types/
    index.ts                      # Tool, Command, CompareEntry, SearchResult TS types
scripts/
  schema.sql                      # CREATE TABLE statements
  seed.sql                        # INSERT seed data for all 5 tools + sample commands
.env.example                      # DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js 15 app with TypeScript and Tailwind**

```bash
cd /d/git/ai-command-atlas
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: project scaffolded in `/d/git/ai-command-atlas`

- [ ] **Step 2: Install additional dependencies**

```bash
npm install mysql2
npm install -D @types/node
npx shadcn@latest init -d
```

When prompted for shadcn/ui, choose: Default style, Neutral color, yes to CSS variables.

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=ai_command_atlas
EOF
cp .env.example .env.local
```

Edit `.env.local` with real credentials.

- [ ] **Step 4: Configure Tailwind to expose CSS variables**

Edit `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "risk-low": "var(--risk-low)",
        "risk-high": "var(--risk-high)",
        "risk-med": "var(--risk-med)",
      },
      fontFamily: {
        mono: ["var(--mono)", "monospace"],
        sans: ["var(--sans)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "var(--r)",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Write CSS variables to `globals.css`**

Replace `src/app/globals.css` entirely:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #ffffff;
  --surface: #fafafa;
  --fg: #09090b;
  --muted: #71717a;
  --border: #e4e4e7;
  --border-light: #f4f4f5;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-bg: #eff6ff;
  --risk-low: #16a34a;
  --risk-low-bg: #f0fdf4;
  --risk-med: #d97706;
  --risk-med-bg: #fffbeb;
  --risk-high: #dc2626;
  --risk-high-bg: #fef2f2;
  --r: 6px;
  --code-bg: #18181b;
  --claude-color: #d97706;
  --codex-color: #16a34a;
  --gemini-color: #2563eb;
  --aider-color: #7c3aed;
  --oc-color: #0891b2;
  --sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
  --mono: "JetBrains Mono", "Fira Code", ui-monospace, "SF Mono", Menlo, monospace;
}

[data-theme="dark"] {
  --bg: #09090b;
  --surface: #111113;
  --fg: #fafafa;
  --muted: #a1a1aa;
  --border: #27272a;
  --border-light: #1c1c1f;
  --accent: #60a5fa;
  --accent-hover: #93c5fd;
  --accent-bg: #172554;
  --risk-low-bg: #052e16;
  --risk-low: #4ade80;
  --risk-med-bg: #1c1400;
  --risk-med: #fbbf24;
  --risk-high-bg: #2d0a0a;
  --risk-high: #f87171;
}

*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  background: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server at http://localhost:3000, no errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 project with Tailwind and design tokens"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**

```typescript
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
  syntax: string | null;
  value_hint: string | null;
  parameters: CommandParameter[] | null;
  examples: CommandExample[] | null;
  notes: string[] | null;
  caveats: string[] | null;
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
  category: string;
  risk_level: RiskLevel;
}

export interface CompareCapability {
  id: number;
  capability: string;
  capability_desc: string;
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
  none_label: string | null;
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Database Schema + Seed Data

**Files:**
- Create: `scripts/schema.sql`, `scripts/seed.sql`

- [ ] **Step 1: Write schema.sql**

```sql
-- scripts/schema.sql
CREATE DATABASE IF NOT EXISTS ai_command_atlas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_command_atlas;

CREATE TABLE IF NOT EXISTS tools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  company VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  color VARCHAR(16) NOT NULL,
  avatar VARCHAR(8) NOT NULL,
  version VARCHAR(32) NOT NULL,
  source_type ENUM('official','github','community') NOT NULL DEFAULT 'official',
  github_url VARCHAR(512) DEFAULT NULL,
  docs_url VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tool_id INT NOT NULL,
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(256) NOT NULL,
  command_type ENUM('option','slash','subcommand','flag','config') NOT NULL,
  category VARCHAR(64) NOT NULL,
  risk_level ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  source ENUM('official','github','community') NOT NULL DEFAULT 'official',
  description TEXT NOT NULL,
  syntax TEXT DEFAULT NULL,
  value_hint VARCHAR(256) DEFAULT NULL,
  parameters JSON DEFAULT NULL,
  examples JSON DEFAULT NULL,
  notes JSON DEFAULT NULL,
  caveats JSON DEFAULT NULL,
  source_url VARCHAR(512) DEFAULT NULL,
  source_note TEXT DEFAULT NULL,
  related_command_ids JSON DEFAULT NULL,
  last_checked DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tool_slug (tool_id, slug),
  INDEX idx_category (category),
  INDEX idx_risk (risk_level),
  INDEX idx_type (command_type),
  FULLTEXT INDEX ft_search (name, description)
);

CREATE TABLE IF NOT EXISTS compare_capabilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capability VARCHAR(128) NOT NULL,
  capability_desc TEXT NOT NULL,
  category ENUM('model','session','permission','mcp','config') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS compare_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capability_id INT NOT NULL,
  tool_id INT NOT NULL,
  has_feature TINYINT(1) NOT NULL DEFAULT 1,
  command_name VARCHAR(256) DEFAULT NULL,
  command_slug VARCHAR(128) DEFAULT NULL,
  command_desc TEXT DEFAULT NULL,
  none_label VARCHAR(256) DEFAULT NULL,
  risk_level ENUM('low','medium','high') DEFAULT NULL,
  source ENUM('official','github','community') DEFAULT NULL,
  copy_text VARCHAR(512) DEFAULT NULL,
  FOREIGN KEY (capability_id) REFERENCES compare_capabilities(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: Write seed.sql — tools**

```sql
-- scripts/seed.sql
USE ai_command_atlas;

INSERT INTO tools (slug, name, company, description, color, avatar, version, source_type, github_url, docs_url) VALUES
('claude-code', 'Claude Code', 'Anthropic', 'Anthropic''s agentic coding CLI. Deep IDE integration, rich slash commands, MCP tool protocol, granular permission controls, and context-compaction for long sessions.', '#d97706', 'CC', 'v1.x', 'official', 'https://github.com/anthropics/claude-code', 'https://docs.anthropic.com/en/docs/claude-code'),
('codex-cli', 'Codex CLI', 'OpenAI', 'OpenAI''s lightweight terminal coding agent. Configurable approval modes (suggest / auto-edit / full-auto), sandboxed execution, and support for multiple model providers.', '#16a34a', 'CX', 'v0.1.x', 'official', 'https://github.com/openai/codex', 'https://openai.github.io/codex/docs'),
('gemini-cli', 'Gemini CLI', 'Google', 'Google''s open-source AI agent for the terminal, powered by Gemini models. Supports file operations, web search, image understanding, and tool-use extensions.', '#2563eb', 'GC', 'v0.1.x', 'official', 'https://github.com/google-gemini/gemini-cli', 'https://ai.google.dev/gemini-api/docs/gemini-cli'),
('aider', 'Aider', 'Independent', 'AI pair programmer in your terminal. Git-native with automatic commit messages, multi-file edits, and broad model support (OpenAI, Anthropic, local models via Ollama).', '#7c3aed', 'AI', 'v0.71.x', 'official', 'https://github.com/Aider-AI/aider', 'https://aider.chat/docs'),
('opencode', 'OpenCode', 'Independent', 'Terminal-based AI coding agent from SST with a full TUI interface. Supports multiple providers, persistent sessions, file operations, and shell command execution.', '#0891b2', 'OC', 'v0.1.x', 'github', 'https://github.com/sst/opencode', NULL);
```

- [ ] **Step 3: Write seed.sql — Claude Code commands**

```sql
-- Claude Code commands
SET @cc = (SELECT id FROM tools WHERE slug = 'claude-code');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@cc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify the AI model to use for the current session.', '--model <model-id>', NULL, '2026-05-28'),
(@cc, 'dangerously-skip-permissions', '--dangerously-skip-permissions', 'flag', 'Permission', 'high', 'official', 'Skip all permission prompts — dangerous in production. Allows the agent to execute any action without user confirmation.', '--dangerously-skip-permissions', NULL, '2026-05-28'),
(@cc, 'permission-mode', '--permission-mode', 'option', 'Permission', 'medium', 'official', 'Control permission level: default (ask for everything), acceptEdits (auto-accept file edits), bypassPermissions (full bypass).', '--permission-mode <mode>', '<default|acceptEdits|bypassPermissions>', '2026-05-28'),
(@cc, 'resume', 'resume', 'subcommand', 'Session', 'low', 'official', 'Resume a previous session by conversation ID.', 'claude resume [session-id]', '[session-id]', '2026-05-28'),
(@cc, 'mcp', 'mcp', 'subcommand', 'MCP', 'medium', 'official', 'Manage MCP (Model Context Protocol) server connections: add, remove, list, run servers.', 'claude mcp <add|remove|list|run>', NULL, '2026-05-28'),
(@cc, 'mcp-add', 'mcp add', 'subcommand', 'MCP', 'medium', 'official', 'Register a new MCP tool server. Supports stdio, sse, and http transports.', 'claude mcp add --transport <transport> <name>', NULL, '2026-05-28'),
(@cc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or modify persistent settings stored in ~/.claude/settings.json.', 'claude config', NULL, '2026-05-28'),
(@cc, 'compact', '/compact', 'slash', 'Session', 'low', 'official', 'Compact and compress the current conversation context to free up context window tokens for longer coding sessions.', '/compact [instructions]', NULL, '2026-05-28'),
(@cc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history and start fresh. Alias: /reset.', '/clear', NULL, '2026-05-28'),
(@cc, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display all available slash commands and their descriptions.', '/help', NULL, '2026-05-28'),
(@cc, 'memory', '/memory', 'slash', 'Config', 'low', 'official', 'Read or write to the persistent CLAUDE.md memory file.', '/memory', NULL, '2026-05-28'),
(@cc, 'claude-md', 'CLAUDE.md', 'config', 'Config', 'low', 'official', 'Project or global instructions file injected into every session. Checked in project root or home directory.', 'CLAUDE.md', NULL, '2026-05-28');

-- Update /compact with full details
UPDATE commands SET
  notes = JSON_ARRAY(
    'Compaction uses the model itself to write the summary — quality depends on how well you phrase the optional instructions. Be specific about tasks in progress.',
    'The original conversation history is discarded after compaction — there is no undo. If you need the full context, use resume to start a new session instead.',
    'Works best after a clearly defined phase has completed (e.g. after a bug fix, before switching features).'
  ),
  caveats = JSON_ARRAY(
    'The summary is non-deterministic — two identical invocations may produce slightly different summaries depending on the model sampling.',
    'Tool call outputs (large file reads, long command output) may be summarised aggressively. If a specific shell output is critical, quote it explicitly in your instructions.'
  ),
  examples = JSON_ARRAY(
    JSON_OBJECT('label', 'After a long debugging session', 'lang', 'shell', 'code', '> /compact Keep the bug in auth.ts we just fixed and the test structure. Forget the failed attempts.'),
    JSON_OBJECT('label', 'Before switching to a new subtask', 'lang', 'shell', 'code', '> /compact Summarise the database migration work. I am now working on the API layer.')
  ),
  source_url = 'https://docs.anthropic.com/en/docs/claude-code',
  source_note = 'Verified against official Claude Code documentation.'
WHERE tool_id = @cc AND slug = 'compact';
```

- [ ] **Step 4: Write seed.sql — Codex CLI commands**

```sql
SET @cx = (SELECT id FROM tools WHERE slug = 'codex-cli');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@cx, 'compact', '/compact', 'slash', 'Session', 'low', 'official', 'Compact and compress the current conversation context to free up context window tokens.', '/compact [instructions]', NULL, '2026-05-28'),
(@cx, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display all available slash commands and their descriptions.', '/help', NULL, '2026-05-28'),
(@cx, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history and start fresh.', '/clear', NULL, '2026-05-28'),
(@cx, 'history', '/history', 'slash', 'Session', 'low', 'official', 'Show a paginated log of the current conversation history.', '/history', NULL, '2026-05-28'),
(@cx, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify the OpenAI model to use (e.g. o4-mini, gpt-4o).', '--model <model-id>', '-m <model-id>', '2026-05-28'),
(@cx, 'provider', '--provider', 'option', 'Model', 'low', 'official', 'Select the AI provider backend (openai, azure, ollama, anthropic).', '--provider <provider>', '<provider>', '2026-05-28'),
(@cx, 'temperature', '--temperature', 'option', 'Model', 'low', 'github', 'Control model sampling randomness. Float 0.0–2.0.', '--temperature <float>', '<0.0-2.0>', '2026-05-28'),
(@cx, 'approval-mode', '--approval-mode', 'option', 'Permission', 'medium', 'official', 'Control how the agent requests user approval before executing actions.', '--approval-mode <mode>', '<suggest|auto-edit|full-auto>', '2026-05-28'),
(@cx, 'sandbox', '--sandbox', 'flag', 'Permission', 'low', 'github', 'Run the agent inside an isolated sandbox environment (macOS Sandbox or Docker).', '--sandbox[=<policy>]', NULL, '2026-05-28'),
(@cx, 'full-auto', '--full-auto', 'flag', 'Permission', 'high', 'official', 'Enable fully autonomous execution — agent acts without any approval prompts.', '--full-auto', NULL, '2026-05-28'),
(@cx, 'dangerously-auto-approve-everything', '--dangerously-auto-approve-everything', 'flag', 'Permission', 'high', 'official', 'Auto-approve all actions without confirmation — use only in trusted, isolated environments.', '--dangerously-auto-approve-everything', NULL, '2026-05-28'),
(@cx, 'quiet', '--quiet', 'flag', 'Config', 'low', 'official', 'Suppress verbose output, only show essential messages and results.', '--quiet', '-q', '2026-05-28'),
(@cx, 'json', '--json', 'flag', 'Config', 'low', 'official', 'Output structured JSON instead of human-readable text.', '--json', NULL, '2026-05-28'),
(@cx, 'config-path', '--config', 'option', 'Config', 'low', 'official', 'Specify a custom path to the Codex configuration file.', '--config <path>', '<path>', '2026-05-28'),
(@cx, 'context-window-size', '--context-window-size', 'option', 'Config', 'low', 'github', 'Override the default maximum context window token limit.', '--context-window-size <tokens>', '<tokens>', '2026-05-28'),
(@cx, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or interactively edit persistent Codex configuration values.', 'codex config [get|set] [key] [value]', NULL, '2026-05-28'),
(@cx, 'resume', 'resume', 'subcommand', 'Session', 'low', 'official', 'Resume a previous Codex session by session ID or interactively select from history.', 'codex resume [session-id]', '[session-id]', '2026-05-28'),
(@cx, 'agents-md', 'AGENTS.md', 'config', 'Config', 'low', 'official', 'Agent instructions file loaded at project level, injected into every session.', 'AGENTS.md', NULL, '2026-05-28');
```

- [ ] **Step 5: Write seed.sql — Gemini CLI commands**

```sql
SET @gc = (SELECT id FROM tools WHERE slug = 'gemini-cli');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@gc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Select the Gemini model variant (e.g. gemini-2.5-pro).', '--model <model-id>', '<model-id>', '2026-05-28'),
(@gc, 'compress', '/compress', 'slash', 'Session', 'low', 'official', 'Compress conversation history to free up context window.', '/compress', NULL, '2026-05-28'),
(@gc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28'),
(@gc, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display available commands and usage information.', '/help', NULL, '2026-05-28'),
(@gc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit Gemini CLI configuration stored in ~/.gemini/config.yaml.', 'gemini config', NULL, '2026-05-28'),
(@gc, 'gemini-md', 'GEMINI.md', 'config', 'Config', 'low', 'official', 'Custom instructions file loaded from project root, injected into every session.', 'GEMINI.md', NULL, '2026-05-28');
```

- [ ] **Step 6: Write seed.sql — Aider commands**

```sql
SET @ai = (SELECT id FROM tools WHERE slug = 'aider');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@ai, 'model', '--model', 'option', 'Model', 'low', 'official', 'Select the AI model to use. Supports OpenAI, Anthropic, and local models via Ollama.', '--model <model-id>', '<model-id>', '2026-05-28'),
(@ai, 'temperature', '--temperature', 'option', 'Model', 'low', 'official', 'Control model sampling temperature. Float, model-specific range.', '--temperature <float>', NULL, '2026-05-28'),
(@ai, 'watch', '--watch', 'flag', 'Session', 'low', 'official', 'Watch files for changes and auto-apply suggested edits.', '--watch', NULL, '2026-05-28'),
(@ai, 'yes', '--yes', 'flag', 'Permission', 'high', 'official', 'Auto-confirm all prompts without user approval.', '--yes', '-y', '2026-05-28'),
(@ai, 'drop', '/drop', 'slash', 'Session', 'low', 'official', 'Drop all files from the current context.', '/drop', NULL, '2026-05-28'),
(@ai, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display available commands and usage information.', '/help', NULL, '2026-05-28'),
(@ai, 'tokens', '/tokens', 'slash', 'Session', 'low', 'official', 'Show token usage statistics for the current session.', '/tokens', NULL, '2026-05-28'),
(@ai, 'system-md', '.aider.system.md', 'config', 'Config', 'low', 'official', 'Custom system prompt file loaded at session start.', '.aider.system.md', NULL, '2026-05-28'),
(@ai, 'conf-yml', '.aider.conf.yml', 'config', 'Config', 'low', 'official', 'YAML configuration file for persistent Aider settings.', '.aider.conf.yml', NULL, '2026-05-28');
```

- [ ] **Step 7: Write seed.sql — OpenCode commands**

```sql
SET @oc = (SELECT id FROM tools WHERE slug = 'opencode');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@oc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify via provider/model format (e.g. anthropic/claude-opus-4-5).', '--model <provider/model>', NULL, '2026-05-28'),
(@oc, 'provider', '--provider', 'option', 'Model', 'low', 'official', 'Select AI provider: anthropic, openai, groq, ollama.', '--provider <provider>', NULL, '2026-05-28'),
(@oc, 'mcp', 'mcp', 'subcommand', 'MCP', 'medium', 'official', 'Native MCP support — add, remove, list tool servers.', 'opencode mcp <add|remove|list>', NULL, '2026-05-28'),
(@oc, 'mcp-add', 'mcp add', 'subcommand', 'MCP', 'medium', 'official', 'Register a new MCP tool server.', 'opencode mcp add', NULL, '2026-05-28'),
(@oc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit configuration with get/set/list subcommands.', 'opencode config [get|set|list]', NULL, '2026-05-28'),
(@oc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28');
```

- [ ] **Step 8: Write seed.sql — Compare capabilities**

```sql
-- Compare capabilities
INSERT INTO compare_capabilities (capability, capability_desc, category, sort_order) VALUES
('Specify model', 'Choose which model variant to use per session', 'model', 1),
('Select provider', 'Switch between API providers (OpenAI, Anthropic, local)', 'model', 2),
('Set temperature', 'Control model sampling randomness', 'model', 3),
('Compact context', 'Summarise history to free context window tokens', 'session', 1),
('Resume session', 'Continue a previous conversation by ID', 'session', 2),
('Clear history', 'Wipe conversation without summary', 'session', 3),
('Skip permissions', 'Execute without approval prompts', 'permission', 1),
('Sandbox mode', 'Isolate execution from host filesystem', 'permission', 2),
('Approval mode', 'Granular control over what auto-executes', 'permission', 3),
('MCP support', 'Model Context Protocol tool server integration', 'mcp', 1),
('Add MCP server', 'Register a new tool server', 'mcp', 2),
('View / edit config', 'Inspect and modify persistent settings', 'config', 1),
('Custom instructions file', 'Project or global instructions injected into every session', 'config', 2);
```

- [ ] **Step 9: Write seed.sql — Compare entries**

```sql
-- Compare entries (capability_id references order from INSERT above)
-- Get IDs via subquery pattern
SET @cap_model1 = (SELECT id FROM compare_capabilities WHERE capability='Specify model');
SET @cap_model2 = (SELECT id FROM compare_capabilities WHERE capability='Select provider');
SET @cap_model3 = (SELECT id FROM compare_capabilities WHERE capability='Set temperature');
SET @cap_sess1  = (SELECT id FROM compare_capabilities WHERE capability='Compact context');
SET @cap_sess2  = (SELECT id FROM compare_capabilities WHERE capability='Resume session');
SET @cap_sess3  = (SELECT id FROM compare_capabilities WHERE capability='Clear history');
SET @cap_perm1  = (SELECT id FROM compare_capabilities WHERE capability='Skip permissions');
SET @cap_perm2  = (SELECT id FROM compare_capabilities WHERE capability='Sandbox mode');
SET @cap_perm3  = (SELECT id FROM compare_capabilities WHERE capability='Approval mode');
SET @cap_mcp1   = (SELECT id FROM compare_capabilities WHERE capability='MCP support');
SET @cap_mcp2   = (SELECT id FROM compare_capabilities WHERE capability='Add MCP server');
SET @cap_cfg1   = (SELECT id FROM compare_capabilities WHERE capability='View / edit config');
SET @cap_cfg2   = (SELECT id FROM compare_capabilities WHERE capability='Custom instructions file');

SET @cc = (SELECT id FROM tools WHERE slug='claude-code');
SET @cx = (SELECT id FROM tools WHERE slug='codex-cli');
SET @gc = (SELECT id FROM tools WHERE slug='gemini-cli');
SET @ai = (SELECT id FROM tools WHERE slug='aider');
SET @oc = (SELECT id FROM tools WHERE slug='opencode');

INSERT INTO compare_entries (capability_id, tool_id, has_feature, command_name, command_slug, command_desc, none_label, risk_level, source, copy_text) VALUES
-- Specify model
(@cap_model1,@cc,1,'--model','model','e.g. claude-opus-4-5',NULL,'low','official','--model claude-opus-4-5'),
(@cap_model1,@cx,1,'--model','model','e.g. o4-mini, gpt-4o',NULL,'low','official','--model o4-mini'),
(@cap_model1,@gc,1,'--model','model','e.g. gemini-2.5-pro',NULL,'low','official','--model gemini-2.5-pro'),
(@cap_model1,@ai,1,'--model','model','e.g. gpt-4o, claude-3-5-sonnet',NULL,'low','official','--model claude-3-5-sonnet-20241022'),
(@cap_model1,@oc,1,'--model','model','Specify via provider/model format',NULL,'low','official','--model anthropic/claude-opus-4-5'),
-- Select provider
(@cap_model2,@cc,0,NULL,NULL,NULL,'Not applicable',NULL,NULL,NULL),
(@cap_model2,@cx,1,'--provider','provider','openai, azure, ollama, anthropic',NULL,'low','official','--provider ollama'),
(@cap_model2,@gc,0,NULL,NULL,NULL,'Google-only',NULL,NULL,NULL),
(@cap_model2,@ai,0,NULL,NULL,NULL,'Uses model ID prefix',NULL,NULL,NULL),
(@cap_model2,@oc,1,'--provider','provider','anthropic, openai, groq, ollama',NULL,'low','official','--provider groq'),
-- Set temperature
(@cap_model3,@cc,0,NULL,NULL,NULL,'Via settings.json',NULL,NULL,NULL),
(@cap_model3,@cx,1,'--temperature','temperature','Float 0.0–2.0',NULL,'low','github','--temperature 0.2'),
(@cap_model3,@gc,0,NULL,NULL,NULL,'Not exposed',NULL,NULL,NULL),
(@cap_model3,@ai,1,'--temperature','temperature','Float, model-specific range',NULL,'low','official','--temperature 0'),
(@cap_model3,@oc,0,NULL,NULL,NULL,'Via config file',NULL,NULL,NULL),
-- Compact context
(@cap_sess1,@cc,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@cx,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@gc,1,'/compress','compress','Compresses history automatically',NULL,'low','official','/compress'),
(@cap_sess1,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess1,@oc,0,NULL,NULL,NULL,'Planned',NULL,NULL,NULL),
-- Resume session
(@cap_sess2,@cc,1,'resume','resume','Subcommand, pass session ID',NULL,'low','official','claude resume'),
(@cap_sess2,@cx,1,'resume','resume','Interactive picker if no ID given',NULL,'low','official','codex resume'),
(@cap_sess2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess2,@ai,0,NULL,NULL,NULL,'No persistent sessions',NULL,NULL,NULL),
(@cap_sess2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
-- Clear history
(@cap_sess3,@cc,1,'/clear','clear','Alias: /reset',NULL,'low','official','/clear'),
(@cap_sess3,@cx,1,'/clear','clear','Wipes current session',NULL,'low','official','/clear'),
(@cap_sess3,@gc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
(@cap_sess3,@ai,1,'/drop','drop','Drops all files from context',NULL,'low','official','/drop'),
(@cap_sess3,@oc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
-- Skip permissions
(@cap_perm1,@cc,1,'--dangerously-skip-permissions','dangerously-skip-permissions','Full bypass, all tools',NULL,'high','official','--dangerously-skip-permissions'),
(@cap_perm1,@cx,1,'--dangerously-auto-approve-everything','dangerously-auto-approve-everything','Auto-approves all actions',NULL,'high','official','--dangerously-auto-approve-everything'),
(@cap_perm1,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm1,@ai,1,'--yes','yes','Auto-confirm all prompts',NULL,'high','official','--yes'),
(@cap_perm1,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
-- Sandbox mode
(@cap_perm2,@cc,0,NULL,NULL,NULL,'Uses OS-level containers',NULL,NULL,NULL),
(@cap_perm2,@cx,1,'--sandbox','sandbox','macOS Sandbox / Docker',NULL,'low','github','--sandbox'),
(@cap_perm2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
-- Approval mode
(@cap_perm3,@cc,1,'--permission-mode','permission-mode','default, acceptEdits, bypassPermissions',NULL,'medium','official','--permission-mode acceptEdits'),
(@cap_perm3,@cx,1,'--approval-mode','approval-mode','suggest, auto-edit, full-auto',NULL,'medium','official','--approval-mode auto-edit'),
(@cap_perm3,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm3,@ai,0,NULL,NULL,NULL,'Per-action prompts only',NULL,NULL,NULL),
(@cap_perm3,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
-- MCP support
(@cap_mcp1,@cc,1,'mcp','mcp','Native — add, remove, list, run servers',NULL,'medium','official','claude mcp add'),
(@cap_mcp1,@cx,0,NULL,NULL,NULL,'Not yet implemented',NULL,NULL,NULL),
(@cap_mcp1,@gc,0,NULL,NULL,NULL,'Planned (Google extensions)',NULL,NULL,NULL),
(@cap_mcp1,@ai,0,NULL,NULL,NULL,'Not supported',NULL,NULL,NULL),
(@cap_mcp1,@oc,1,'mcp','mcp','Native MCP support via config',NULL,'medium','official','opencode mcp add'),
-- Add MCP server
(@cap_mcp2,@cc,1,'mcp add','mcp-add','Supports stdio, sse, http',NULL,'medium','official','claude mcp add --transport stdio my-server'),
(@cap_mcp2,@cx,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@oc,1,'mcp add','mcp-add',NULL,NULL,'medium','official','opencode mcp add'),
-- View / edit config
(@cap_cfg1,@cc,1,'config','config','JSON settings at ~/.claude/settings.json',NULL,'low','official','claude config'),
(@cap_cfg1,@cx,1,'config','config','Interactive editor + get/set subcommands',NULL,'low','official','codex config set model o4-mini'),
(@cap_cfg1,@gc,1,'config','config','YAML config at ~/.gemini/config.yaml',NULL,'low','official','gemini config'),
(@cap_cfg1,@ai,0,NULL,NULL,NULL,'Via .aider.conf.yml',NULL,NULL,NULL),
(@cap_cfg1,@oc,1,'config','config','JSON config with get/set/list',NULL,'low','official','opencode config list'),
-- Custom instructions file
(@cap_cfg2,@cc,1,'CLAUDE.md','claude-md','Checked in project root or home dir',NULL,'low','official','CLAUDE.md'),
(@cap_cfg2,@cx,1,'AGENTS.md','agents-md','Agent instructions, project-level',NULL,'low','official','AGENTS.md'),
(@cap_cfg2,@gc,1,'GEMINI.md','gemini-md','Loaded from project root',NULL,'low','official','GEMINI.md'),
(@cap_cfg2,@ai,1,'.aider.system.md','system-md','Custom system prompt file',NULL,'low','official','.aider.system.md'),
(@cap_cfg2,@oc,0,NULL,NULL,NULL,'Via config instructions key',NULL,NULL,NULL);
```

- [ ] **Step 10: Apply schema and seed**

```bash
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql
```

Expected: no errors, tables created, data inserted.

- [ ] **Step 11: Commit**

```bash
git add scripts/
git commit -m "feat: add database schema and seed data for all 5 tools"
```

---

## Task 4: Database Library

**Files:**
- Create: `src/lib/db.ts`, `src/lib/queries.ts`

- [ ] **Step 1: Write db.ts**

```typescript
// src/lib/db.ts
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ai_command_atlas",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+00:00",
});

export default pool;
```

- [ ] **Step 2: Write queries.ts — all query functions**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/
git commit -m "feat: add mysql2 DB pool and typed query functions"
```

---

## Task 5: Shared Components

**Files:**
- Create: `src/components/badge.tsx`, `src/components/nav.tsx`, `src/components/footer.tsx`, `src/components/theme-toggle.tsx`, `src/components/copy-button.tsx`, `src/components/code-block.tsx`

- [ ] **Step 1: Write badge.tsx**

```tsx
// src/components/badge.tsx
import type { RiskLevel, SourceType, CommandType } from "@/types";

const riskClass: Record<RiskLevel, string> = {
  low: "bg-[var(--risk-low-bg)] text-[var(--risk-low)]",
  medium: "bg-[var(--risk-med-bg)] text-[var(--risk-med)]",
  high: "bg-[var(--risk-high-bg)] text-[var(--risk-high)]",
};
const sourceClass: Record<SourceType, string> = {
  official: "bg-[#eff6ff] text-[#2563eb] dark:bg-[#172554] dark:text-[#93c5fd]",
  github: "bg-[#f5f3ff] text-[#7c3aed] dark:bg-[#2e1065] dark:text-[#c4b5fd]",
  community: "bg-[#f4f4f5] text-[#52525b] dark:bg-[#18181b] dark:text-[#a1a1aa]",
};
const typeClass: Record<CommandType, string> = {
  option: "bg-[#eff6ff] text-[#1d4ed8]",
  slash: "bg-[#f0fdf4] text-[#15803d]",
  subcommand: "bg-[#fdf4ff] text-[#7e22ce]",
  flag: "bg-[#f4f4f5] text-[#52525b]",
  config: "bg-[#f4f4f5] text-[#52525b]",
};

const riskLabel: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High" };
const sourceLabel: Record<SourceType, string> = { official: "Official", github: "GitHub", community: "Community" };
const typeLabel: Record<CommandType, string> = {
  option: "Option", slash: "Slash", subcommand: "Subcommand", flag: "Flag", config: "Config"
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium whitespace-nowrap ${riskClass[level]}`}>{riskLabel[level]}</span>;
}
export function SourceBadge({ source }: { source: SourceType }) {
  return <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium whitespace-nowrap ${sourceClass[source]}`}>{sourceLabel[source]}</span>;
}
export function TypeBadge({ type }: { type: CommandType }) {
  return <span className={`inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium whitespace-nowrap ${typeClass[type]}`}>{typeLabel[type]}</span>;
}
export function CatBadge({ label }: { label: string }) {
  return <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium whitespace-nowrap bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">{label}</span>;
}
```

- [ ] **Step 2: Write copy-button.tsx**

```tsx
// src/components/copy-button.tsx
"use client";
import { useState } from "react";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium cursor-pointer border rounded-[4px] px-2 py-[3px] transition-colors ${copied ? "text-[var(--risk-low)] border-[var(--risk-low-bg)]" : "text-[#a1a1aa] border-[rgba(255,255,255,.1)] hover:text-[#e4e4e7] hover:border-[rgba(255,255,255,.2)]"} ${className}`}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
```

- [ ] **Step 3: Write code-block.tsx**

```tsx
// src/components/code-block.tsx
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
  lang?: string;
  code: string;
  copyText?: string;
}

export function CodeBlock({ lang = "shell", code, copyText }: CodeBlockProps) {
  return (
    <div className="relative bg-[var(--code-bg)] rounded-[var(--r)] overflow-hidden mt-2">
      <div className="flex items-center justify-between px-[14px] pt-2 pb-[6px] border-b border-[rgba(255,255,255,.06)]">
        <span className="font-mono text-[10px] font-semibold text-[#71717a] uppercase tracking-[.06em]">{lang}</span>
        <CopyButton text={copyText ?? code} />
      </div>
      <pre className="px-4 py-[14px] overflow-x-auto font-mono text-[12.5px] leading-[1.65] text-[#e4e4e7] whitespace-pre">{code}</pre>
    </div>
  );
}
```

- [ ] **Step 4: Write theme-toggle.tsx**

```tsx
// src/components/theme-toggle.tsx
"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("atlas-theme");
    if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      setDark(true);
    }
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("atlas-theme", next);
    setDark(!dark);
  };

  return (
    <button onClick={toggle} aria-label="Toggle theme"
      className="inline-flex items-center gap-1 h-7 px-[9px] border border-[var(--border)] rounded-[var(--r)] text-[12px] font-medium text-[var(--muted)] bg-transparent cursor-pointer hover:text-[var(--fg)] hover:border-[#a1a1aa] transition-colors">
      {dark
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
    </button>
  );
}
```

- [ ] **Step 5: Write nav.tsx**

The nav matches the design: logo, Home/Tools/Compare links, language selector, theme toggle, GitHub button. Extract active state from `usePathname()`.

```tsx
// src/components/nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home", zhLabel: "首页" },
  { href: "/tools", label: "Tools", zhLabel: "工具" },
  { href: "/compare", label: "Compare", zhLabel: "对比" },
];

export function Nav() {
  const path = usePathname();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("atlas-lang") || "en";
    setLang(saved);
  }, []);

  const switchLang = (l: string) => {
    setLang(l);
    localStorage.setItem("atlas-lang", l);
  };

  return (
    <nav className="sticky top-0 z-50 h-12 px-6 border-b border-[var(--border)] bg-[rgba(255,255,255,0.95)] [data-theme=dark]:bg-[rgba(9,9,11,0.95)] backdrop-blur-sm flex items-center justify-between">
      <div className="flex items-center gap-[6px]">
        <Link href="/" className="font-mono text-[13px] font-semibold text-[var(--fg)] no-underline tracking-[-0.02em] px-2 py-1 rounded-[var(--r)]">
          ai-command-<span className="text-[var(--accent)]">atlas</span>
        </Link>
        <div className="w-px h-5 bg-[var(--border)] mx-[6px]" />
        {navLinks.map(l => (
          <Link key={l.href} href={l.href}
            className={`text-[13px] no-underline px-[10px] py-1 rounded-[var(--r)] transition-colors max-[600px]:hidden ${path === l.href ? "text-[var(--fg)] font-medium" : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)]"}`}>
            {lang === "zh" ? l.zhLabel : l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <select value={lang} onChange={e => switchLang(e.target.value)}
          className="h-7 pl-[9px] pr-6 border border-[var(--border)] rounded-[var(--r)] text-[12px] font-medium text-[var(--muted)] bg-[var(--bg)] cursor-pointer outline-none appearance-none hover:text-[var(--fg)] hover:border-[#a1a1aa] transition-colors"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2371717a'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center', backgroundSize: '10px 6px' }}>
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
        <ThemeToggle />
        <a href="https://github.com/luoianun/ai-command-atlas" target="_blank" rel="noopener"
          className="inline-flex items-center gap-[5px] text-[12px] font-medium text-[var(--muted)] no-underline px-[10px] py-1 border border-[var(--border)] rounded-[var(--r)] hover:text-[var(--fg)] hover:border-[#a1a1aa] transition-colors">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </nav>
  );
}
```

- [ ] **Step 6: Write footer.tsx**

```tsx
// src/components/footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] px-6 py-5 flex items-center justify-between mt-2">
      <span className="text-[12px] text-[var(--muted)]">ai-command-atlas · community maintained · MIT</span>
      <div className="flex gap-4">
        <a href="https://github.com/luoianun/ai-command-atlas" className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">GitHub</a>
        <a href="https://github.com/luoianun/ai-command-atlas/issues" className="text-[12px] text-[var(--muted)] no-underline hover:text-[var(--fg)]">Contribute</a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Write root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "ai-command-atlas — AI CLI Command Reference",
  description: "Search AI CLI commands, slash commands, options, and examples for Claude Code, Codex CLI, Gemini CLI, Aider, and OpenCode.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('atlas-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();` }} />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/app/layout.tsx
git commit -m "feat: add shared components (nav, footer, badges, code-block, theme-toggle)"
```

---

## Task 6: Search API Route

**Files:**
- Create: `src/app/api/search/route.ts`, `src/app/api/stats/route.ts`

- [ ] **Step 1: Write search route**

```typescript
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchCommands } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const tool = req.nextUrl.searchParams.get("tool") ?? undefined;
  if (q.length < 1) return NextResponse.json([]);
  const results = await searchCommands(q, tool);
  return NextResponse.json(results);
}
```

- [ ] **Step 2: Write stats route**

```typescript
// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getStats, getCategoryStats } from "@/lib/queries";

export async function GET() {
  const [stats, categories] = await Promise.all([getStats(), getCategoryStats()]);
  return NextResponse.json({ stats, categories });
}
```

- [ ] **Step 3: Test search API manually**

```bash
curl "http://localhost:3000/api/search?q=model"
```

Expected: JSON array of search results with `id, slug, name, tool_slug, tool_name, description, category, risk_level`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add search and stats API routes"
```

---

## Task 7: Search Bar Component

**Files:**
- Create: `src/components/search-bar.tsx`

- [ ] **Step 1: Write search-bar.tsx**

Full implementation of the search dropdown from index.html design:
- Input with ⌘K shortcut
- Debounced fetch from `/api/search`
- Keyboard navigation (↑↓ Enter Esc)
- Shows: command name, description, tool tag
- Closes on outside click

```tsx
// src/components/search-bar.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/types";

export function SearchBar({ activeTool }: { activeTool?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const search = useCallback(async (q: string, tool?: string) => {
    if (!q.trim()) { setOpen(false); return; }
    const params = new URLSearchParams({ q });
    if (tool && tool !== "all") params.set("tool", tool);
    const res = await fetch(`/api/search?${params}`);
    const data: SearchResult[] = await res.json();
    setResults(data.slice(0, 7));
    setFocusIdx(-1);
    setOpen(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query, activeTool), 150);
    return () => clearTimeout(t);
  }, [query, activeTool, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (r: SearchResult) => {
    router.push(`/commands/${r.tool_slug}/${r.slug}`);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && focusIdx >= 0) navigate(results[focusIdx]);
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative max-w-[560px] mx-auto mb-5" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
      </svg>
      <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
        placeholder="Search commands, tools, categories…" autoComplete="off" spellCheck={false}
        className="w-full h-[46px] pl-10 pr-12 border border-[var(--border)] rounded-[var(--r)] font-mono text-[13px] text-[var(--fg)] bg-[var(--bg)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.08)]" />
      <kbd className="absolute right-[11px] top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] py-[1px]">⌘K</kbd>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r)] shadow-[0_8px_24px_rgba(0,0,0,.08)] z-[100] overflow-hidden text-left">
          {results.length === 0 ? (
            <div className="p-6 text-center text-[var(--muted)] text-[13px]">No results for "<strong>{query}</strong>"</div>
          ) : (
            <>
              {results.map((r, i) => (
                <button key={r.id} onMouseDown={() => navigate(r)}
                  className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] cursor-pointer text-[var(--fg)] transition-colors text-left ${i === focusIdx ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"}`}>
                  <span className="font-mono text-[12px] font-medium text-[var(--accent)] min-w-[160px]">{r.name}</span>
                  <span className="text-[12px] text-[var(--muted)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{r.description}</span>
                  <span className="text-[10px] font-medium text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[1px] whitespace-nowrap">{r.tool_name}</span>
                </button>
              ))}
              <div className="flex justify-between px-[14px] py-[7px] border-t border-[var(--border-light)] text-[11px] text-[var(--muted)]">
                <span>↑↓ navigate</span><span>↵ open · Esc close</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/search-bar.tsx
git commit -m "feat: add search bar with keyboard navigation and API integration"
```

---

## Task 8: Home Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/tool-chips.tsx`

- [ ] **Step 1: Write tool-chips.tsx (client component)**

Interactive pill buttons for filtering by tool (All / Claude Code / Codex CLI / etc.)

```tsx
// src/components/tool-chips.tsx
"use client";
import { useState } from "react";

const TOOLS = [
  { key: "all", label: "All", dot: null },
  { key: "claude-code", label: "Claude Code", dotColor: "#d97706" },
  { key: "codex-cli", label: "Codex CLI", dotColor: "#16a34a" },
  { key: "gemini-cli", label: "Gemini CLI", dotColor: "#2563eb" },
  { key: "aider", label: "Aider", dotColor: "#7c3aed" },
  { key: "opencode", label: "OpenCode", dotColor: "#0891b2" },
];

export function ToolChips({ onChange }: { onChange?: (key: string) => void }) {
  const [active, setActive] = useState("all");
  const select = (key: string) => { setActive(key); onChange?.(key); };

  return (
    <div className="flex gap-[6px] justify-center flex-wrap">
      {TOOLS.map(t => (
        <button key={t.key} onClick={() => select(t.key)}
          className={`inline-flex items-center gap-[5px] px-3 py-1 border rounded-full text-[12px] font-medium cursor-pointer transition-all select-none
            ${active === t.key ? "bg-[var(--fg)] border-[var(--fg)] text-white" : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)] hover:border-[#a1a1aa] hover:text-[var(--fg)]"}`}>
          {t.dotColor && <span className="w-[6px] h-[6px] rounded-full" style={{ background: t.dotColor }} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write home page**

```tsx
// src/app/page.tsx
import Link from "next/link";
import { getRecentCommands, getStats, getCategoryStats, getTools } from "@/lib/queries";
import { SearchBar } from "@/components/search-bar";
import { ToolChips } from "@/components/tool-chips";
import { RiskBadge, SourceBadge, CatBadge } from "@/components/badge";

export default async function HomePage() {
  const [commands, stats, categories, tools] = await Promise.all([
    getRecentCommands(10),
    getStats(),
    getCategoryStats(),
    getTools(),
  ]);

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero */}
      <div className="py-[52px_0_36px] text-center border-b border-[var(--border-light)]">
        <div className="inline-flex items-center gap-[5px] font-mono text-[11px] font-medium text-[var(--muted)] tracking-[.06em] uppercase border border-[var(--border)] rounded-full px-[10px] py-[3px] mb-4">
          <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
          ai-command-atlas
        </div>
        <p className="text-[15px] text-[var(--muted)] mb-6 max-w-[480px] mx-auto">
          Search AI CLI commands, slash commands, options, and examples.
        </p>
        <SearchBar />
        <ToolChips />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center py-5 border-b border-[var(--border-light)]">
        {[
          { n: stats.cli_count, l: "CLIs" },
          { n: stats.command_count, l: "Commands" },
          { n: stats.slash_count, l: "Slash Commands" },
          { n: stats.official_count, l: "Official Sources" },
        ].map((s, i) => (
          <div key={i} className={`text-center px-7 ${i > 0 ? "border-l border-[var(--border)]" : ""}`}>
            <div className="font-mono text-[22px] font-semibold text-[var(--fg)] leading-[1.2]">{s.n}</div>
            <div className="text-[11px] text-[var(--muted)] mt-[2px]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Browse by Category */}
      <div className="py-8 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-[14px]">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">Browse by Category</span>
        </div>
        <div className="flex gap-[6px] flex-wrap">
          {categories.map(c => (
            <Link key={c.category} href={`/tools?category=${encodeURIComponent(c.category)}`}
              className="inline-flex items-center gap-[6px] px-3 py-[5px] border border-[var(--border)] rounded-[var(--r)] text-[12px] font-medium text-[var(--fg)] bg-[var(--bg)] hover:bg-[var(--surface)] hover:border-[#a1a1aa] transition-colors no-underline">
              {c.category}
              <span className="font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] leading-[17px]">{c.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main: command table + sidebar */}
      <div className="py-8 grid grid-cols-[1fr_300px] gap-8 max-[900px]:grid-cols-1">
        {/* Commands table */}
        <div>
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">Recently Updated</span>
            <Link href="/tools" className="text-[12px] text-[var(--accent)] no-underline hover:text-[var(--accent-hover)] hover:underline">All commands →</Link>
          </div>
          <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[180px]">Command</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Description</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">Category</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[72px]">Risk</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">Source</th>
              </tr>
            </thead>
            <tbody>
              {commands.map(cmd => (
                <tr key={cmd.id} className="cursor-pointer hover:bg-[var(--surface)] transition-colors"
                  onClick={() => {}}>
                  <td className="px-3 py-[9px] border-b border-[var(--border-light)]">
                    <Link href={`/commands/${cmd.tool_slug}/${cmd.slug}`} className="no-underline">
                      <div className="font-mono text-[12px] font-medium text-[var(--accent)]">{cmd.name}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-[1px]">{cmd.tool_name}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-[9px] border-b border-[var(--border-light)] max-w-[320px] text-[var(--fg)]">{cmd.description}</td>
                  <td className="px-3 py-[9px] border-b border-[var(--border-light)]"><CatBadge label={cmd.category} /></td>
                  <td className="px-3 py-[9px] border-b border-[var(--border-light)]"><RiskBadge level={cmd.risk_level} /></td>
                  <td className="px-3 py-[9px] border-b border-[var(--border-light)]"><SourceBadge source={cmd.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sidebar: Tools */}
        <div>
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em]">AI CLI Tools</span>
            <Link href="/tools" className="text-[12px] text-[var(--accent)] no-underline hover:underline">All tools →</Link>
          </div>
          {tools.map(t => (
            <Link key={t.id} href={`/tools/${t.slug}`}
              className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-[var(--r)] no-underline text-[var(--fg)] hover:border-[#a1a1aa] hover:shadow-[0_1px_6px_rgba(0,0,0,.05)] transition-all mb-[6px]">
              <div className="w-8 h-8 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0" style={{ color: t.color }}>{t.avatar}</div>
              <div>
                <div className="text-[13px] font-semibold">{t.name}</div>
                <div className="text-[11px] text-[var(--muted)] mt-[1px]">{t.command_count} commands · {t.company}</div>
              </div>
              <span className="ml-auto text-[var(--muted)] text-[12px]">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Visually verify home page at http://localhost:3000**

Check:
- Search hero, stats, category chips, command table, tool sidebar render correctly
- Theme toggle works
- Search finds results

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/tool-chips.tsx
git commit -m "feat: implement home page with search, stats, categories, command table, tool sidebar"
```

---

## Task 9: Tools List Page (`/tools`)

**Files:**
- Create: `src/app/tools/page.tsx`

- [ ] **Step 1: Write tools list page**

Server component fetches tools; client-side filtering via URL params or React state.

The page matches `desgin/tools.html`: grid of tool cards, provider filter chips, search input.

```tsx
// src/app/tools/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Tool } from "@/types";

const PROVIDERS = ["", "Anthropic", "OpenAI", "Google", "Independent"];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("");

  useEffect(() => {
    fetch("/api/tools").then(r => r.json()).then(setTools);
  }, []);

  const visible = tools.filter(t => {
    const q = query.toLowerCase();
    const matchQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchP = !provider || t.company === provider;
    return matchQ && matchP;
  });

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Page header */}
      <div className="py-7 border-b border-[var(--border)]">
        <nav className="flex items-center gap-[6px] text-[12px] text-[var(--muted)] mb-[10px]">
          <Link href="/" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Home</Link>
          <span className="opacity-40">/</span>
          <span>Tools</span>
        </nav>
        <h1 className="text-[20px] font-bold tracking-[-0.02em] mb-1">AI CLI Tools</h1>
        <p className="text-[13px] text-[var(--muted)]">{tools.length} tools indexed · browse commands, options, and slash commands for each CLI</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-[10px] py-[18px] pb-4 flex-wrap">
        <div className="relative flex-1 max-w-[360px] min-w-[200px]">
          <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools…"
            className="w-full h-9 pl-[34px] pr-3 border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,.07)] transition-all" />
        </div>
        <div className="flex items-center gap-[6px] flex-wrap">
          <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.06em] whitespace-nowrap">Provider</span>
          <div className="flex gap-1 flex-wrap">
            {PROVIDERS.map(p => (
              <button key={p} onClick={() => setProvider(p)}
                className={`px-[10px] py-1 border rounded-full text-[12px] font-medium cursor-pointer transition-all whitespace-nowrap ${provider === p ? "bg-[var(--fg)] border-[var(--fg)] text-white" : "border-[var(--border)] text-[var(--muted)] bg-[var(--bg)] hover:border-[#a1a1aa] hover:text-[var(--fg)]"}`}>
                {p || "All"}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-[12px] text-[var(--muted)] whitespace-nowrap">{visible.length} tools</span>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 pb-12 max-[700px]:grid-cols-1">
        {visible.map(t => (
          <Link key={t.id} href={`/tools/${t.slug}`}
            className="flex flex-col border border-[var(--border)] rounded-[8px] p-[18px_20px] no-underline text-[var(--fg)] hover:border-[#a1a1aa] hover:shadow-[0_2px_10px_rgba(0,0,0,.06)] transition-all cursor-pointer">
            <div className="flex items-start gap-[14px] mb-3">
              <div className="w-10 h-10 rounded-[8px] flex-shrink-0 border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[11px] font-bold" style={{ color: t.color }}>{t.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold tracking-[-0.01em] mb-[2px]">{t.name}</div>
                <div className="text-[11px] text-[var(--muted)]">by {t.company}</div>
              </div>
            </div>
            <p className="text-[12px] text-[var(--muted)] leading-[1.55] mb-[14px] flex-1">{t.description}</p>
            <div className="flex items-center gap-[6px] flex-wrap pt-3 border-t border-[var(--border-light)]">
              <span className="w-[6px] h-[6px] rounded-full" style={{ background: t.color }} />
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)] font-mono">{t.command_count} commands</span>
              <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">{t.version}</span>
              <span className="flex-1" />
              <svg className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M3.5 7.5h8m0 0L8 4m3.5 3.5L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </Link>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full py-12 text-center text-[var(--muted)] border border-[var(--border)] rounded-[var(--r)]">
            <strong className="text-[var(--fg)] block text-[14px] mb-[6px]">No tools match your filter</strong>
            Try clearing the search or selecting a different provider.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `/api/tools` route**

```typescript
// src/app/api/tools/route.ts
import { NextResponse } from "next/server";
import { getTools } from "@/lib/queries";

export async function GET() {
  const tools = await getTools();
  return NextResponse.json(tools);
}
```

- [ ] **Step 3: Visual verify at http://localhost:3000/tools**

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/page.tsx src/app/api/tools/
git commit -m "feat: implement tools list page with provider filter"
```

---

## Task 10: Tool Detail Page (`/tools/:tool`)

**Files:**
- Create: `src/app/tools/[tool]/page.tsx`
- Create: `src/app/tools/[tool]/command-table-client.tsx`

- [ ] **Step 1: Write tool detail server page**

```tsx
// src/app/tools/[tool]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getToolBySlug, getCommandsByTool } from "@/lib/queries";
import { CatBadge } from "@/components/badge";
import { CommandTableClient } from "./command-table-client";

export default async function ToolPage({ params }: { params: { tool: string } }) {
  const [tool, commands] = await Promise.all([
    getToolBySlug(params.tool),
    getCommandsByTool(params.tool),
  ]);
  if (!tool) notFound();

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[6px] py-[14px] text-[12px] text-[var(--muted)]">
        <Link href="/" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Home</Link>
        <span className="opacity-40">/</span>
        <Link href="/tools" className="text-[var(--muted)] no-underline hover:text-[var(--fg)]">Tools</Link>
        <span className="opacity-40">/</span>
        <span>{tool.name}</span>
      </nav>

      {/* Tool header */}
      <div className="pt-5 pb-6 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4 max-[700px]:flex-col">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center font-mono text-[13px] font-bold flex-shrink-0" style={{ color: tool.color }}>
              {tool.avatar}
            </div>
            <div>
              <div className="text-[20px] font-bold tracking-[-0.02em] mb-1">{tool.name}</div>
              <div className="text-[13px] text-[var(--muted)] max-w-[520px] mb-[10px]">{tool.description}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <CatBadge label={`by ${tool.company}`} />
                <CatBadge label={`${tool.command_count} commands`} />
                <span className="inline-flex items-center px-[7px] py-[2px] rounded-[4px] text-[11px] font-medium" style={{ background: '#f0fdf4', color: '#15803d' }}>{tool.version}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {tool.github_url && (
              <a href={tool.github_url} target="_blank" rel="noopener"
                className="inline-flex items-center gap-[5px] text-[12px] font-medium text-[var(--fg)] no-underline px-3 py-[5px] border border-[var(--border)] rounded-[var(--r)] hover:bg-[var(--surface)] hover:border-[#a1a1aa] transition-all">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                GitHub
              </a>
            )}
            {tool.docs_url && (
              <a href={tool.docs_url} target="_blank" rel="noopener"
                className="inline-flex items-center text-[12px] font-medium text-white no-underline px-3 py-[5px] bg-[var(--fg)] border border-[var(--fg)] rounded-[var(--r)] hover:bg-[#27272a] transition-all">
                Official Docs ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Client command table with tabs + filters */}
      <CommandTableClient commands={commands} toolSlug={tool.slug} />
    </div>
  );
}
```

- [ ] **Step 2: Write `command-table-client.tsx`**

```tsx
// src/app/tools/[tool]/command-table-client.tsx
"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Command, CommandType } from "@/types";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";

type Tab = "all" | CommandType;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "option", label: "Command Options" },
  { key: "slash", label: "Slash Commands" },
  { key: "config", label: "Config" },
];

const CATEGORIES = ["", "Model", "Permission", "Session", "Config", "MCP", "Output"];
const RISKS = ["", "Low", "Medium", "High"];

export function CommandTableClient({ commands, toolSlug }: { commands: Command[]; toolSlug: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [risk, setRisk] = useState("");
  const router = useRouter();

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: commands.length };
    commands.forEach(c => {
      counts[c.command_type] = (counts[c.command_type] || 0) + 1;
    });
    return counts;
  }, [commands]);

  const filtered = useMemo(() => commands.filter(c => {
    const tabMatch = tab === "all" || c.command_type === tab;
    const catMatch = !cat || c.category.toLowerCase() === cat.toLowerCase();
    const riskMatch = !risk || c.risk_level === risk.toLowerCase();
    const qMatch = !query || c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase());
    return tabMatch && catMatch && riskMatch && qMatch;
  }), [commands, tab, cat, risk, query]);

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-[2px] border-b border-[var(--border)] pt-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer border-b-2 mb-[-1px] transition-colors bg-transparent border-x-0 border-t-0
              ${tab === t.key ? "text-[var(--fg)] border-b-[var(--fg)]" : "text-[var(--muted)] border-b-transparent hover:text-[var(--fg)]"}`}>
            {t.label}
            <span className="font-mono text-[10px] font-semibold bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[5px] text-[var(--muted)]">
              {t.key === "all" ? tabCounts["all"] : (tabCounts[t.key] || 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between py-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0zm-.657 3.757 2.7 2.7-.707.707-2.7-2.7a4.5 4.5 0 11.707-.707z" fill="currentColor" fillRule="evenodd"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter commands…"
              className="h-[34px] pl-[32px] pr-[10px] w-[220px] border border-[var(--border)] rounded-[var(--r)] font-mono text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none focus:border-[var(--accent)] transition-colors" />
          </div>
          <select value={cat} onChange={e => setCat(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c}>{c || "All categories"}</option>)}
          </select>
          <select value={risk} onChange={e => setRisk(e.target.value)}
            className="h-[34px] px-2 border border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--fg)] bg-[var(--bg)] outline-none cursor-pointer">
            {RISKS.map(r => <option key={r} value={r}>{r || "All risks"}</option>)}
          </select>
        </div>
        <span className="text-[12px] text-[var(--muted)]">{filtered.length} command{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-[var(--border)] rounded-[var(--r)] overflow-hidden text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[200px] whitespace-nowrap">Command</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[90px]">Type</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)]">Description</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[110px]">Category</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[76px]">Risk</th>
              <th className="text-left px-[14px] py-2 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.05em] bg-[var(--surface)] border-b border-[var(--border)] w-[96px]">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(cmd => (
              <tr key={cmd.id} onClick={() => router.push(`/commands/${toolSlug}/${cmd.slug}`)}
                className="cursor-pointer hover:bg-[var(--surface)] transition-colors">
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)]">
                  <div className="font-mono text-[12px] font-semibold text-[var(--accent)]">{cmd.name}</div>
                  {cmd.value_hint && <div className="font-mono text-[11px] text-[var(--muted)] mt-[2px]">{cmd.value_hint}</div>}
                </td>
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)]"><TypeBadge type={cmd.command_type} /></td>
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)] text-[var(--fg)]">{cmd.description}</td>
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)]"><CatBadge label={cmd.category} /></td>
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)]"><RiskBadge level={cmd.risk_level} /></td>
                <td className="px-[14px] py-[10px] border-b border-[var(--border-light)]"><SourceBadge source={cmd.source} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--muted)]">
                <strong className="text-[var(--fg)] block text-[14px] mb-[6px]">No commands found</strong>
                Try clearing the filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Visual verify at http://localhost:3000/tools/codex-cli**

- [ ] **Step 4: Commit**

```bash
git add src/app/tools/
git commit -m "feat: implement tool detail page with tab filters and command table"
```

---

## Task 11: Command Detail Page (`/commands/:tool/:command`)

**Files:**
- Create: `src/app/commands/[tool]/[command]/page.tsx`

- [ ] **Step 1: Write command detail page**

Matches `desgin/compact.html`: 2-column layout (main + sidebar).

Main column:
- Title with type/category/risk/source badges
- Description section
- Syntax code block (with copy)
- Parameters table (if any)
- Examples section (with copy per example)
- Notes list (info icon)
- Caveats list (warning icon, amber tint)
- Related commands table

Sidebar:
- Meta card: Tool, Type, Category, Risk, Source, Last Checked
- Official Source card (URL + note)
- Similar in Other CLIs card (cross-tool equivalents)
- Edit on GitHub link

```tsx
// src/app/commands/[tool]/[command]/page.tsx
import { notFound } from "next/navigation";
import { getCommandBySlug } from "@/lib/queries";
import { RiskBadge, SourceBadge, TypeBadge, CatBadge } from "@/components/badge";
import { CodeBlock } from "@/components/code-block";
import Link from "next/link";

export default async function CommandPage({ params }: { params: { tool: string; command: string } }) {
  const cmd = await getCommandBySlug(params.tool, params.command);
  if (!cmd) notFound();

  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Breadcrumb: Home / Tools / {tool} / {command} */}

      <div className="grid grid-cols-[1fr_256px] gap-10 items-start pb-16 max-[860px]:grid-cols-1">
        {/* Main */}
        <div>
          {/* Badges + title */}
          <div className="mb-4">
            <div className="flex gap-[6px] flex-wrap mb-2">
              <TypeBadge type={cmd.command_type} />
              <CatBadge label={cmd.category} />
              <RiskBadge level={cmd.risk_level} />
              <SourceBadge source={cmd.source} />
            </div>
            <h1 className="font-mono text-[28px] font-bold tracking-[-0.03em]">{cmd.name}</h1>
          </div>

          {/* Description */}
          <section className="mb-8">
            <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Description</div>
            <p className="text-[14px] text-[var(--fg)] leading-[1.7]">{cmd.description}</p>
          </section>

          {/* Syntax */}
          {cmd.syntax && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Syntax</div>
              <CodeBlock lang="shell" code={cmd.syntax} />
            </section>
          )}

          {/* Examples */}
          {cmd.examples && cmd.examples.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Examples</div>
              {cmd.examples.map((ex, i) => (
                <div key={i}>
                  {ex.label && <p className="text-[12px] text-[var(--muted)] mb-2">{ex.label}:</p>}
                  <CodeBlock lang={ex.lang} code={ex.code} />
                </div>
              ))}
            </section>
          )}

          {/* Notes */}
          {cmd.notes && cmd.notes.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Notes</div>
              <ul className="flex flex-col gap-2">
                {cmd.notes.map((n, i) => (
                  <li key={i} className="flex gap-[10px] p-[10px_12px] border border-[var(--border-light)] rounded-[var(--r)] text-[13px] leading-[1.6]">
                    <svg className="flex-shrink-0 mt-[1px] text-[var(--accent)]" width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor"/><path d="M7.5 4v4m0 2.5v.5" stroke="currentColor" strokeLinecap="round"/></svg>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Caveats */}
          {cmd.caveats && cmd.caveats.length > 0 && (
            <section className="mb-8 border-t border-[var(--border-light)] pt-7">
              <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-[.08em] mb-[10px]">Caveats</div>
              <ul className="flex flex-col gap-2">
                {cmd.caveats.map((c, i) => (
                  <li key={i} className="flex gap-[10px] p-[10px_12px] border border-[var(--risk-med-bg)] rounded-[var(--r)] bg-[#fffcf0] text-[13px] leading-[1.6]">
                    <svg className="flex-shrink-0 mt-[1px] text-[var(--risk-med)]" width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M8.36 1.5a1 1 0 00-1.72 0l-6 10A1 1 0 001.5 13h12a1 1 0 00.86-1.5l-6-10z" stroke="currentColor" strokeLinejoin="round"/><path d="M7.5 6v3m0 2v.5" stroke="currentColor" strokeLinecap="round"/></svg>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="sticky top-[68px] max-[860px]:static">
          {/* Meta card */}
          <div className="border border-[var(--border)] rounded-[var(--r)] overflow-hidden mb-3">
            <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)]">Command Info</div>
            {[
              { k: "Tool", v: <Link href={`/tools/${cmd.tool_slug}`} className="text-[var(--accent)] no-underline hover:underline">{cmd.tool_name}</Link> },
              { k: "Type", v: cmd.command_type },
              { k: "Category", v: cmd.category },
              { k: "Risk", v: <RiskBadge level={cmd.risk_level} /> },
              { k: "Source", v: <SourceBadge source={cmd.source} /> },
              { k: "Last checked", v: <span className="font-mono text-[11px]">{cmd.last_checked}</span> },
            ].map(row => (
              <div key={row.k} className="flex items-center justify-between px-[14px] py-[9px] border-b border-[var(--border-light)] text-[12px] last:border-b-0">
                <span className="text-[var(--muted)]">{row.k}</span>
                <span className="font-medium text-right">{row.v}</span>
              </div>
            ))}
          </div>

          {/* Source card */}
          {cmd.source_url && (
            <div className="border border-[var(--border)] rounded-[var(--r)] overflow-hidden mb-3">
              <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[.07em] px-[14px] py-[10px] bg-[var(--surface)] border-b border-[var(--border)]">Official Source</div>
              <div className="p-[12px_14px]">
                <a href={cmd.source_url} target="_blank" rel="noopener" className="text-[12px] text-[var(--accent)] no-underline flex items-center gap-[5px]">
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M8 2.5a.5.5 0 000-1V2.5zm5 5a.5.5 0 000-1V7.5zm-5-5H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V7.5h-1V11H3V3.5h5v-1zm0 0h4.5M8 2.5l4.5 4.5M12.5 2.5V7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {cmd.source_url.replace(/^https?:\/\//, "")}
                </a>
                {cmd.source_note && <p className="text-[11px] text-[var(--muted)] mt-2 leading-[1.5]">{cmd.source_note}</p>}
              </div>
            </div>
          )}

          {/* Edit link */}
          <div className="mt-3 p-3 border border-dashed border-[var(--border)] rounded-[var(--r)] text-[12px] text-[var(--muted)] text-center">
            See a mistake? <a href="https://github.com/luoianun/ai-command-atlas/issues" className="text-[var(--accent)] no-underline">Edit on GitHub ↗</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Visual verify at http://localhost:3000/commands/codex-cli/compact**

- [ ] **Step 3: Commit**

```bash
git add src/app/commands/
git commit -m "feat: implement command detail page with syntax, examples, notes, caveats, sidebar"
```

---

## Task 12: Compare Page (`/compare`)

**Files:**
- Create: `src/app/compare/page.tsx`, `src/app/compare/compare-table-client.tsx`

- [ ] **Step 1: Write compare page**

Server Component fetches all compare data. Client component handles category tabs + copy buttons.

The page matches `desgin/compare.html`: category tab bar (Model/Session/Permission/MCP/Config), legend, and per-category compare tables showing all 5 tools as columns.

- [ ] **Step 2: Seed compare_entries data in seed.sql (Task 3, Step 9)**

For each of the 13 capabilities × 5 tools, insert rows using data from compare.html.

- [ ] **Step 3: Visual verify at http://localhost:3000/compare**

- [ ] **Step 4: Commit**

```bash
git add src/app/compare/
git commit -m "feat: implement compare page with capability tabs and cross-CLI table"
```

---

## Task 13: Responsive Polish & Dark Mode

- [ ] **Step 1: Test all pages at each viewport**

Using browser DevTools, verify at: 360×800, 390×844, 768×1024, 1366×768, 1440×900, 1920×1080.

Key checks:
- No horizontal overflow
- Nav links hide on mobile (< 600px)
- Grid collapses to 1 column (tools page ≤ 700px, home grid ≤ 900px, command detail ≤ 860px)
- Compare table scrolls horizontally on mobile

- [ ] **Step 2: Test dark mode**

Toggle dark mode, verify all pages look correct using dark CSS variables.

- [ ] **Step 3: Fix any visual regressions**

- [ ] **Step 4: Add `not-found.tsx` pages**

```tsx
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="max-w-[1120px] mx-auto px-6 py-20 text-center">
      <h1 className="text-[20px] font-bold mb-2">404 — Not Found</h1>
      <p className="text-[var(--muted)]">The page or command you're looking for doesn't exist.</p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: responsive layout and dark mode polish"
```

---

## Task 14: Final Wiring & Seed Data Completion

- [ ] **Step 1: Complete compare_entries seed data (Task 3, Step 9)**

Insert all 65 rows (13 capabilities × 5 tools) based on compare.html data.

- [ ] **Step 2: Add similar commands cross-references**

For commands that appear in multiple tools (/compact, --model, /clear, etc.), query siblings in DB to show in command detail sidebar "Similar in Other CLIs" section.

Add query:
```typescript
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
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete seed data and similar command cross-references"
```

---

## Quick Reference: Dev Commands

```bash
# Start dev server
npm run dev

# Apply schema (first time)
mysql -u root -p < scripts/schema.sql

# Apply seed data
mysql -u root -p ai_command_atlas < scripts/seed.sql

# Build for production
npm run build
npm start
```

## Environment Variables (`.env.local`)

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=ai_command_atlas
```
