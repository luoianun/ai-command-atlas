# ai-command-atlas

A searchable reference site for AI coding CLIs. It brings command-line options, slash commands, config files, examples, risk levels, official sources, and cross-tool capability comparisons into one bilingual interface.

[简体中文](./README.zh-CN.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

## What It Does

- **Search AI CLI commands** — `⌘K` / `Ctrl+K` opens global search across tools, commands, categories, descriptions, and syntax.
- **Browse by tool** — Each CLI has a detail page with command counts, metadata, filters, and source links.
- **Browse all commands** — Filter by tool, type, category, risk level, and text query.
- **Read command details** — Syntax, parameters, examples, notes, caveats, copy buttons, and official documentation links.
- **Compare capabilities** — Side-by-side table for Model, Session, Permission, MCP, and Config capabilities, with sticky first column and horizontal scrolling.
- **Switch language and theme** — English / Chinese UI and dark / light mode are both persisted locally.
- **Update data with scrapers** — TypeScript scrapers fetch official docs, enrich command records, generate SQL, and optionally translate content with Claude.

## Supported Tools

| Tool | Provider | Coverage |
|------|----------|----------|
| Claude Code | Anthropic | CLI commands, slash commands, permissions, MCP, config |
| Codex CLI | OpenAI | CLI options, approval modes, sandboxing, config |
| Gemini CLI | Google | CLI reference, slash commands, extensions |
| Aider | Independent | CLI options, slash commands, model/config options |
| OpenCode | SST / Independent | CLI commands, TUI commands, providers, config |
| Goose | Block / AAIF | Sessions, recipes, extensions, MCP, modes |
| Cline | Cline | VS Code commands, modes, rules, MCP prompts |
| Kiro | AWS | CLI chat, agents, specs, steering, hooks, MCP |
| GitHub Copilot CLI | GitHub | `gh copilot` suggest/explain/config commands |
| Qoder | Alibaba | Quest mode, Repo Wiki, Action Flow, CLI commands |
| Trae | ByteDance | Builder mode, chat, rules, MCP, spec workflow |
| Kilo Code | Kilo | modes, MCP, rules, browser/terminal controls |

## Tech Stack

- **Frontend** — Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/base-ui-style components
- **Backend** — Server Components, Next.js API routes, mysql2 connection pooling
- **Database** — MySQL 8.0 with schema/seed SQL and scraper-generated enrichment data
- **Data pipeline** — `tsx` scripts, Cheerio, Playwright fallback, GitHub API, optional Claude translation
- **Deployment** — Docker Compose for app + MySQL, or manual Node.js/PM2/Nginx deployment

## Quick Start

### Option 1: Docker (recommended)

**Prerequisite:** Docker Desktop or Docker Engine with Compose.

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
docker compose up -d --build
```

Open http://localhost:3000

On first run, MySQL initializes from:

- `scripts/schema.sql` — table definitions
- `scripts/seed.sql` — base tools, commands, comparison capabilities
- `scripts/scraped-data.sql` — scraper-enriched command data

Useful commands:

```bash
docker compose logs -f          # follow logs
docker compose down             # stop services
docker compose down -v          # stop and remove MySQL data volume
```

| Service | Container Port | Host Port |
|---------|----------------|-----------|
| Next.js app | 3000 | 3000 |
| MySQL 8.0 | 3306 | 3307 |

For an existing database that was initialized before the newer tool set was added, import the supplemental seed once:

```bash
docker exec -i atlas-mysql mysql -u root -patlas_pass ai_command_atlas < scripts/seed-new-tools.sql
```

### Option 2: Node.js

Use this when you want to run the app directly or connect to an existing MySQL instance.

**Prerequisites:** Node.js 20+, MySQL 8.0.

```bash
# 1. Clone and install
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm install

# 2. Configure database
cp .env.example .env.local
# Edit .env.local with your MySQL credentials

# 3. Initialize database
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql
mysql -u root -p ai_command_atlas < scripts/scraped-data.sql
# Optional for existing DBs that do not have the newer 7 tools yet:
mysql -u root -p ai_command_atlas < scripts/seed-new-tools.sql

# 4. Start dev server
npm run dev
```

Open http://localhost:3000

## Data Scrapers

The project includes per-tool scrapers under `scripts/scrapers/`. They fetch official docs, normalize commands, match or insert DB rows, generate SQL files, and can translate fields into Chinese through the Claude API.

```bash
npm run scrape -- aider --dry-run        # scrape one tool and generate SQL only
npm run scrape -- all --dry-run          # scrape every supported tool without DB writes
npm run scrape -- all --translate        # scrape + translate + write to DB
npm run scrape:all                       # shorthand for all tools
npm run scrape:translate                 # shorthand for all tools with translation
```

Supported scraper targets:

```text
aider, gemini-cli, opencode, claude-code, codex-cli, goose, cline, kiro, gh-copilot, qoder, trae, kilo-code
```

Generated SQL is written to `scripts/scrapers/output/` and is ignored by git. To export the current database enrichment into a reproducible SQL file, use the export scripts in `scripts/`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASS` | Database password | `password` |
| `DB_NAME` | Database name | `ai_command_atlas` |
| `ANTHROPIC_API_KEY` | Optional Claude API key for scraper translation | unset |
| `ANTHROPIC_BASE_URL` | Optional Anthropic-compatible API base URL | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | Optional translation model override | `claude-sonnet-4-6` |
| `GITHUB_TOKEN` | Optional GitHub token for higher scraper rate limits | unset |

## Production Deployment

### Docker

```bash
git pull --ff-only
docker compose up -d --build
```

### Manual (PM2 + Nginx)

**Prerequisites:** Node.js 20+, MySQL 8.0, PM2.

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm ci --omit=dev
cp .env.example .env.local
npm run build
pm2 start npm --name atlas -- start
pm2 save
pm2 startup
```

Example Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
nginx -t && nginx -s reload
```

## Project Structure

```text
src/
├── app/
│   ├── page.tsx                         # Home page
│   ├── tools/page.tsx                   # Tool listing
│   ├── tools/[tool]/page.tsx            # Tool detail page
│   ├── commands/page.tsx                # All commands page
│   ├── commands/[tool]/[command]/       # Command detail page
│   ├── compare/page.tsx                 # Cross-tool comparison page
│   └── api/                             # search, suggest, stats, tools, commands
├── components/
│   ├── nav.tsx / footer.tsx
│   ├── search-bar.tsx                   # Global command search
│   ├── tool-avatar.tsx / tool-chips.tsx
│   ├── badge.tsx                        # Risk, source, type, category badges
│   ├── code-block.tsx                   # Copyable code blocks
│   └── language-provider.tsx
├── lib/
│   ├── db.ts                            # mysql2 pool
│   └── queries.ts                       # Data access helpers
└── types/index.ts                       # Shared TypeScript types
scripts/
├── schema.sql                           # Database schema
├── seed.sql                             # Base seed data
├── seed-new-tools.sql                   # Supplemental data for newer tools
├── scraped-data.sql                     # Exported scraper enrichment data
├── export-scraped-data.*                # DB export helpers
└── scrapers/                            # Per-tool documentation scrapers
```

## Common Commands

```bash
npm run dev              # start local dev server
npm run build            # production build
npm run start            # start production server
npm run lint             # run ESLint
npm run scrape -- aider  # run one scraper
```

## Contributing

Contributions are welcome through GitHub Issues and pull requests:

- Add or correct command metadata
- Add official source links, examples, notes, or caveats
- Improve scraper coverage for a supported tool
- Suggest a new AI coding CLI to include
- Report UI, data, or deployment bugs

## License

MIT
