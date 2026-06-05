# ai-command-atlas

A searchable command reference for AI coding CLIs. Covers command-line options, slash commands, usage examples, risk levels, and official sources for Claude Code, Codex CLI, Gemini CLI, Aider, and OpenCode — all in one place.

[简体中文](./README.zh-CN.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

## Features

- **Full-text search** — `⌘K` / `Ctrl+K` to open; searches across command names, tool names, categories, and descriptions
- **Tool detail pages** — Complete command listing per CLI with type tabs, category and risk-level filters
- **Command detail pages** — Syntax, examples (with copy button), notes, caveats, and official source links
- **Cross-tool comparison** — Side-by-side capability table across Model / Session / Permission / MCP / Config dimensions
- **Dark / light mode** — Toggle in real time, preference persisted
- **EN / ZH language switch** — Toggle in navbar, preference persisted

## Supported Tools

| Tool | Provider |
|------|----------|
| Claude Code | Anthropic |
| Codex CLI | OpenAI |
| Gemini CLI | Google |
| Aider | Independent |
| OpenCode | SST · Independent |

## Tech Stack

- **Frontend** — Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
- **Backend** — Next.js API Routes + Server Components
- **Database** — MySQL 8.0 (all command data stored in DB, nothing hardcoded)

## Quick Start

### Option 1: Docker (recommended)

One command to spin up the full stack. No need to install MySQL separately.

**Prerequisites:** Docker Desktop

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
docker compose up -d
```

On first run this will: build the image → initialize MySQL (schema + seed data) → start the app.

Open http://localhost:3000

```bash
docker compose logs -f          # follow logs
docker compose down             # stop
docker compose down -v          # stop and wipe data (re-initializes on next start)
```

| Service | Internal Port | Host Port |
|---------|--------------|-----------|
| Next.js app | 3000 | 3000 |
| MySQL 8.0 | 3306 | 3307 (avoids conflict with local MySQL) |

### Option 2: Node.js

For when you prefer not to use Docker, or want to connect to an existing MySQL instance.

**Prerequisites:** Node.js 20+, MySQL 8.0

```bash
# 1. Clone and install
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm install

# 2. Configure database connection
cp .env.example .env.local
# Edit .env.local with your MySQL credentials

# 3. Initialize database
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql

# 4. Start dev server
npm run dev
```

Open http://localhost:3000

## Production Deployment

### Docker

Same as Quick Start Option 1. Customize configuration by editing environment variables in `docker-compose.yml`.

To update:

```bash
git pull
docker compose up -d --build
```

### Manual (PM2 + Nginx)

For deploying directly to a VPS or cloud server.

**Prerequisites:** Node.js 20+, MySQL 8.0, PM2 (`npm i -g pm2`)

#### 1. Install & build

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm ci --omit=dev
```

#### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=atlas
DB_PASS=your_password
DB_NAME=ai_command_atlas
```

> Recommended: create a least-privilege database user:
> ```sql
> CREATE USER 'atlas'@'localhost' IDENTIFIED BY 'your_password';
> GRANT SELECT, INSERT, UPDATE, DELETE ON ai_command_atlas.* TO 'atlas'@'localhost';
> FLUSH PRIVILEGES;
> ```

#### 3. Initialize database

```bash
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql
```

#### 4. Build & start

```bash
npm run build

pm2 start npm --name "atlas" -- start
pm2 save       # persist process list
pm2 startup    # generate boot script (run the sudo command it prints)
```

PM2 cheat sheet:

```bash
pm2 status        # check status
pm2 logs atlas    # view logs
pm2 restart atlas # restart
pm2 stop atlas    # stop
```

#### 5. Nginx reverse proxy (optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/your-domain.com.pem;
    ssl_certificate_key /etc/ssl/your-domain.com.key;

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

#### Updating

```bash
git pull
npm ci --omit=dev
npm run build
pm2 restart atlas
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASS` | Database password | `password` |
| `DB_NAME` | Database name | `ai_command_atlas` |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Home (/)
│   ├── tools/page.tsx                  # Tool listing (/tools)
│   ├── tools/[tool]/page.tsx           # Tool detail (/tools/:tool)
│   ├── commands/[tool]/[command]/      # Command detail (/commands/:tool/:command)
│   ├── compare/page.tsx                # Cross-tool comparison (/compare)
│   └── api/                            # search · stats · tools
├── components/
│   ├── nav.tsx / footer.tsx
│   ├── badge.tsx                       # Risk · Source · Type · Category badges
│   ├── search-bar.tsx                  # Global search input
│   ├── code-block.tsx                  # Code block with copy button
│   └── theme-toggle.tsx
├── lib/
│   ├── db.ts                           # mysql2 connection pool
│   └── queries.ts                      # All DB query functions
└── types/index.ts                      # TypeScript type definitions
scripts/
├── schema.sql                          # Table definitions
└── seed.sql                            # Seed data (5 tools · 51 commands · 65 comparison entries)
```

## Contributing

Contributions are welcome via [GitHub Issues](https://github.com/luoianun/ai-command-atlas/issues):
- Command additions or corrections
- New tool suggestions
- Bug reports

## License

MIT
