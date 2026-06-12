# ai-command-atlas

[English](./README.md)

面向开发者的 AI Coding CLI 命令参考站点。它把命令行参数、Slash Commands、配置文件、使用示例、风险等级、官方来源和跨工具能力对比整合到一个中英文双语界面里，方便快速查询和比较各类 AI 编码工具。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

## 项目功能

- **搜索 AI CLI 命令** — 使用 `⌘K` / `Ctrl+K` 打开全局搜索，覆盖工具、命令、分类、描述和语法。
- **按工具浏览** — 每个 CLI 都有独立详情页，展示命令数量、元信息、筛选器和官方来源。
- **浏览全部命令** — 支持按工具、类型、分类、风险等级和文本关键词过滤。
- **查看命令详情** — 包含语法、参数、示例、注意事项、风险说明、复制按钮和官方文档链接。
- **跨工具能力对比** — 按 Model、Session、Permission、MCP、Config 五个维度横向对比，首列固定并支持横向滑动。
- **语言和主题切换** — 支持英文 / 中文界面，以及深色 / 浅色模式，本地持久化偏好。
- **文档抓取与数据更新** — TypeScript 爬虫从官方文档抓取命令，补全数据库，生成 SQL，并可用 Claude API 翻译中文字段。

## 覆盖工具

| 工具 | 提供方 | 覆盖内容 |
|------|--------|----------|
| Claude Code | Anthropic | CLI 命令、Slash Commands、权限、MCP、配置 |
| Codex CLI | OpenAI | CLI 参数、审批模式、沙箱、配置 |
| Gemini CLI | Google | CLI 参考、Slash Commands、扩展能力 |
| Aider | Independent | CLI 参数、Slash Commands、模型/配置选项 |
| OpenCode | SST / Independent | CLI 命令、TUI 命令、Provider、配置 |
| Goose | Block / AAIF | 会话、Recipe、扩展、MCP、模式 |
| Cline | Cline | VS Code 命令、模式、规则、MCP Prompts |
| Kiro | AWS | CLI Chat、Agent、Spec、Steering、Hooks、MCP |
| GitHub Copilot CLI | GitHub | `gh copilot` suggest/explain/config 命令 |
| Qoder | Alibaba | Quest Mode、Repo Wiki、Action Flow、CLI 命令 |
| Trae | ByteDance | Builder Mode、Chat、Rules、MCP、Spec 工作流 |
| Kilo Code | Kilo | 模式、MCP、规则、浏览器/终端控制 |

## 技术栈

- **前端** — Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、shadcn/base-ui 风格组件
- **后端** — Server Components、Next.js API Routes、mysql2 连接池
- **数据库** — MySQL 8.0，使用 schema/seed SQL 和爬虫导出的补全数据
- **数据管线** — `tsx` 脚本、Cheerio、Playwright fallback、GitHub API、可选 Claude 翻译
- **部署** — Docker Compose 部署 app + MySQL，也支持 Node.js/PM2/Nginx 手动部署

## 快速开始

### 方式一：Docker（推荐）

**前置条件：** Docker Desktop 或 Docker Engine + Compose。

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
docker compose up -d --build
```

访问 http://localhost:3000

首次启动时，MySQL 会从以下文件初始化：

- `scripts/schema.sql` — 数据表结构
- `scripts/seed.sql` — 基础工具、命令和对比能力数据
- `scripts/scraped-data.sql` — 爬虫补全后的命令数据

常用命令：

```bash
docker compose logs -f          # 查看日志
docker compose down             # 停止服务
docker compose down -v          # 停止并删除 MySQL 数据卷
```

| 服务 | 容器端口 | 本机端口 |
|------|----------|----------|
| Next.js 应用 | 3000 | 3000 |
| MySQL 8.0 | 3306 | 3307 |

如果是旧数据库，且还没有新增的 7 个工具，可以单独导入补充数据：

```bash
docker exec -i atlas-mysql mysql -u root -patlas_pass ai_command_atlas < scripts/seed-new-tools.sql
```

### 方式二：Node.js 直接运行

适合希望直接运行应用，或连接已有 MySQL 实例的场景。

**前置条件：** Node.js 20+、MySQL 8.0。

```bash
# 1. 克隆并安装依赖
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm install

# 2. 配置数据库
cp .env.example .env.local
# 编辑 .env.local，填入你的 MySQL 连接信息

# 3. 初始化数据库
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql
mysql -u root -p ai_command_atlas < scripts/scraped-data.sql
# 如果已有数据库缺少新增 7 个工具，可选执行：
mysql -u root -p ai_command_atlas < scripts/seed-new-tools.sql

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 数据爬虫

项目在 `scripts/scrapers/` 下提供了按工具拆分的官方文档爬虫。爬虫会抓取官方文档、规范化命令数据、匹配或插入数据库记录、生成 SQL 文件，并可通过 Claude API 翻译中文字段。

```bash
npm run scrape -- aider --dry-run        # 只抓取一个工具并生成 SQL，不写数据库
npm run scrape -- all --dry-run          # 抓取所有工具，但不写数据库
npm run scrape -- all --translate        # 抓取 + 翻译 + 写入数据库
npm run scrape:all                       # all 的快捷命令
npm run scrape:translate                 # all --translate 的快捷命令
```

支持的爬虫目标：

```text
aider, gemini-cli, opencode, claude-code, codex-cli, goose, cline, kiro, gh-copilot, qoder, trae, kilo-code
```

生成的 SQL 会写入 `scripts/scrapers/output/`，该目录已被 git 忽略。如果需要把当前数据库中的补全数据导出成可复现的 SQL 文件，可以使用 `scripts/` 下的导出脚本。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | MySQL 地址 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | 数据库用户名 | `root` |
| `DB_PASS` | 数据库密码 | `password` |
| `DB_NAME` | 数据库名 | `ai_command_atlas` |
| `ANTHROPIC_API_KEY` | 可选，用于爬虫翻译的 Claude API Key | 未设置 |
| `ANTHROPIC_BASE_URL` | 可选，Anthropic 兼容 API 地址 | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | 可选，翻译模型覆盖 | `claude-sonnet-4-6` |
| `GITHUB_TOKEN` | 可选，提高 GitHub API 抓取限额 | 未设置 |

## 生产部署

### Docker 部署

```bash
git pull --ff-only
docker compose up -d --build
```

### 手动部署（PM2 + Nginx）

**前置条件：** Node.js 20+、MySQL 8.0、PM2。

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

Nginx 反向代理示例：

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

## 项目结构

```text
src/
├── app/
│   ├── page.tsx                         # 首页
│   ├── tools/page.tsx                   # 工具列表页
│   ├── tools/[tool]/page.tsx            # 工具详情页
│   ├── commands/page.tsx                # 全部命令页
│   ├── commands/[tool]/[command]/       # 命令详情页
│   ├── compare/page.tsx                 # 跨工具对比页
│   └── api/                             # search, suggest, stats, tools, commands
├── components/
│   ├── nav.tsx / footer.tsx
│   ├── search-bar.tsx                   # 全局命令搜索
│   ├── tool-avatar.tsx / tool-chips.tsx
│   ├── badge.tsx                        # 风险、来源、类型、分类徽章
│   ├── code-block.tsx                   # 可复制代码块
│   └── language-provider.tsx
├── lib/
│   ├── db.ts                            # mysql2 连接池
│   └── queries.ts                       # 数据查询函数
└── types/index.ts                       # 共享 TypeScript 类型
scripts/
├── schema.sql                           # 数据库结构
├── seed.sql                             # 基础种子数据
├── seed-new-tools.sql                   # 新增工具补充数据
├── scraped-data.sql                     # 爬虫补全数据导出
├── export-scraped-data.*                # 数据库导出辅助脚本
└── scrapers/                            # 按工具拆分的官方文档爬虫
```

## 常用命令

```bash
npm run dev              # 启动本地开发服务器
npm run build            # 生产构建
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint
npm run scrape -- aider  # 运行单个爬虫
```

## 贡献

欢迎通过 GitHub Issues 或 Pull Requests 参与：

- 补充或修正命令元数据
- 添加官方来源链接、示例、注意事项或风险说明
- 改进已有工具的爬虫覆盖率
- 建议收录新的 AI Coding CLI
- 报告 UI、数据或部署问题

## License

MIT
