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

## 快速开始

### 方式一：Docker（推荐）

适合快速体验和本地开发，一条命令启动全部服务，无需单独安装 MySQL。

**前置条件：** Docker Desktop

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
docker compose up -d
```

首次启动会自动完成：镜像构建 → MySQL 初始化（建表 + 灌数据） → 应用启动。

访问 http://localhost:3000

```bash
docker compose logs -f          # 查看日志
docker compose down             # 停止
docker compose down -v          # 停止并清除数据（下次启动重新初始化）
```

| 服务 | 容器内端口 | 宿主机端口 |
|------|-----------|-----------|
| Next.js 应用 | 3000 | 3000 |
| MySQL 8.0 | 3306 | 3307（避免与本机冲突） |

### 方式二：Node.js 直接运行

适合不使用 Docker、或需要连接已有 MySQL 实例的场景。

**前置条件：** Node.js 20+、MySQL 8.0

```bash
# 1. 克隆并安装
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm install

# 2. 配置数据库连接
cp .env.example .env.local
# 编辑 .env.local，填入你的 MySQL 信息

# 3. 初始化数据库
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 生产部署

### Docker 部署

与「快速开始 - 方式一」相同，`docker compose up -d` 即可。如需自定义配置，编辑 `docker-compose.yml` 中的环境变量。

更新部署：

```bash
git pull
docker compose up -d --build
```

### 手动部署（PM2 + Nginx）

适合直接部署到 VPS / 云服务器。

**前置条件：** Node.js 20+、MySQL 8.0、PM2（`npm i -g pm2`）

#### 1. 安装 & 构建

```bash
git clone https://github.com/luoianun/ai-command-atlas.git
cd ai-command-atlas
npm ci --omit=dev
```

#### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=atlas
DB_PASS=your_password
DB_NAME=ai_command_atlas
```

> 建议创建最小权限的数据库用户：
> ```sql
> CREATE USER 'atlas'@'localhost' IDENTIFIED BY 'your_password';
> GRANT SELECT, INSERT, UPDATE, DELETE ON ai_command_atlas.* TO 'atlas'@'localhost';
> FLUSH PRIVILEGES;
> ```

#### 3. 初始化数据库

```bash
mysql -u root -p < scripts/schema.sql
mysql -u root -p ai_command_atlas < scripts/seed.sql
```

#### 4. 构建 & 启动

```bash
npm run build

pm2 start npm --name "atlas" -- start
pm2 save       # 保存进程列表
pm2 startup    # 配置开机自启（按提示执行输出的 sudo 命令）
```

PM2 常用命令：

```bash
pm2 status        # 查看状态
pm2 logs atlas    # 查看日志
pm2 restart atlas # 重启
pm2 stop atlas    # 停止
```

#### 5. Nginx 反向代理（可选）

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

#### 更新部署

```bash
git pull
npm ci --omit=dev
npm run build
pm2 restart atlas
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | MySQL 地址 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_USER` | 数据库用户名 | `root` |
| `DB_PASS` | 数据库密码 | `password` |
| `DB_NAME` | 数据库名 | `ai_command_atlas` |

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
