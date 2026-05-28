# ai-command-atlas

面向开发者的 AI Coding CLI 命令速查网站。收录 Claude Code、Codex CLI、Gemini CLI、Aider、OpenCode 的命令行参数、Slash Commands、使用示例、风险等级和官方来源，帮助你在一个地方快速查到任何 AI CLI 命令的含义和用法。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![MySQL](https://img.shields.io/badge/MySQL-8.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

## 功能

- **全文搜索** — `⌘K` / `Ctrl+K` 唤起，覆盖命令名、工具名、分类、描述
- **工具详情页** — 每款 CLI 的完整命令列表，支持类型 Tab 筛选 + 分类/风险过滤
- **命令详情页** — 语法、示例（带复制按钮）、注意事项、风险说明、官方来源
- **横向对比页** — Model / Session / Permission / MCP / Config 五个维度跨工具对比
- **深色/浅色模式** — 实时切换，状态持久化
- **中英文切换** — 导航栏内切换，状态持久化

## 覆盖工具

| 工具 | 提供商 |
|------|--------|
| Claude Code | Anthropic |
| Codex CLI | OpenAI |
| Gemini CLI | Google |
| Aider | Independent |
| OpenCode | SST · Independent |

## 技术栈

- **前端** — Next.js 16 (App Router) · TypeScript · Tailwind CSS · shadcn/ui
- **后端** — Next.js API Routes + Server Components
- **数据库** — MySQL 8.0（所有命令数据均存储在 DB，无硬编码）
- **部署** — Docker + docker-compose

## 本地开发

**前置条件：** Node.js 20+、MySQL 8.0

```bash
# 1. 克隆并进入项目
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas

# 2. 安装依赖
npm install

# 3. 配置数据库连接
cp .env.example .env.local
# 编辑 .env.local，填写你的 MySQL 连接信息

# 4. 初始化数据库
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## Docker 部署

```bash
# 一键启动（首次会自动构建镜像 + 初始化数据库）
docker compose up -d

# 查看日志
docker compose logs -f

# 停止
docker compose down

# 完全重置（含数据库数据）
docker compose down -v && docker compose up -d
```

| 服务 | 地址 |
|------|------|
| 网站 | http://localhost:3000 |
| MySQL | localhost:3307 |

## 环境变量

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password
DB_NAME=ai_command_atlas
```

## 项目结构

```
src/
├── app/
│   ├── page.tsx                        # 首页 (/)
│   ├── tools/page.tsx                  # 工具列表 (/tools)
│   ├── tools/[tool]/page.tsx           # 工具详情 (/tools/:tool)
│   ├── commands/[tool]/[command]/      # 命令详情 (/commands/:tool/:command)
│   ├── compare/page.tsx                # 横向对比 (/compare)
│   └── api/                            # search · stats · tools
├── components/
│   ├── nav.tsx / footer.tsx
│   ├── badge.tsx                       # Risk · Source · Type · Category badges
│   ├── search-bar.tsx                  # 全局搜索框
│   ├── code-block.tsx                  # 代码块（含复制按钮）
│   └── theme-toggle.tsx
├── lib/
│   ├── db.ts                           # mysql2 连接池
│   └── queries.ts                      # 所有 DB 查询函数
└── types/index.ts                      # TypeScript 类型定义
scripts/
├── schema.sql                          # 建表语句
└── seed.sql                            # 初始数据（5 工具 · 51 命令 · 65 条对比数据）
```

## 贡献

欢迎通过 [GitHub Issues](https://github.com/luoianun/ai-command-atlas/issues) 提交：
- 命令补充或纠错
- 新工具收录建议
- Bug 报告

## License

MIT
