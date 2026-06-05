# ai-command-atlas 产品说明文档

> **版本**：v0.1 · **日期**：2026-05-28

---

## 产品简介

**ai-command-atlas** 是一个面向开发者的 AI Coding CLI 命令速查网站。

它收集并整理了当前主流 AI CLI 工具——包括 **Claude Code**、**Codex CLI**、**Gemini CLI**、**Aider**、**OpenCode**——的命令行参数、Slash Commands、使用示例、注意事项、风险等级和官方来源链接，帮助开发者在一个地方快速查到任何 AI CLI 命令的含义、用法和注意事项。

---

## 背景与问题

AI Coding CLI 工具正在快速普及，开发者日常使用 Claude Code、Codex CLI 等工具时频繁遇到以下问题：

- **命令太多记不住**：每款工具都有几十甚至上百条命令、参数和 Slash Commands，文档分散在各自官网、GitHub 和社区。
- **找文档效率低**：遇到一个不熟悉的命令，往往要跳转到官方文档、翻 GitHub README、查 issue 才能搞清楚。
- **工具间缺乏横向对比**：不同 AI CLI 实现了相似的能力，但命令名称和用法各不相同，开发者很难快速类比迁移。
- **风险不透明**：部分命令（如 `--dangerously-skip-permissions`）存在安全风险，官方文档中的提示往往不够显眼。

ai-command-atlas 的目标是成为 AI CLI 开发者的「命令字典」——像查 MDN 查 man page 一样，快速、准确、可信。

---

## 目标用户

- 日常使用 Claude Code、Codex CLI 等 AI Coding 工具的软件开发者
- 初次接触某款 AI CLI、需要快速了解可用命令的工程师
- 需要在多个 AI CLI 之间切换、寻找等效命令的开发者
- 关注 AI CLI 安全性、想了解高风险命令的团队负责人

---

## 核心功能

### 1. 命令搜索

网站核心交互是搜索。开发者打开页面即可直接输入关键词，搜索范围覆盖命令名、工具名、分类、描述，支持键盘快捷键（`⌘K` / `Ctrl+K`）唤起。

### 2. 工具详情页

每款 AI CLI 都有独立的详情页，展示该工具的全部命令，支持按命令类型（Command Options / Slash Commands / Config / Examples）切换，以及按分类和风险等级筛选。

### 3. 命令详情页

每条命令都有独立的详情页，包含：

- **描述**：命令的作用说明
- **语法**：命令格式和参数，附复制按钮
- **示例**：真实可运行的使用示例，附复制按钮
- **注意事项（Notes）**：使用时需要了解的关键信息
- **风险提示（Caveats）**：可能造成不可逆操作或安全风险的说明
- **来源链接**：官方文档 / GitHub / 社区来源
- **相关命令**：同工具内的关联命令
- **其他工具的类似命令**：横向类比参考

### 4. 命令对比页

按能力维度横向对比不同 AI CLI 的等效命令，帮助开发者快速了解「这件事在另一个工具里怎么做」。对比维度包括：Model Selection、Session Management、Permission / Sandbox、MCP、Config 等。

---

## 内容覆盖范围（MVP）

### 支持工具

| 工具 | 说明 |
|---|---|
| Claude Code | Anthropic 官方 AI Coding CLI |
| Codex CLI | OpenAI 开源 AI Coding CLI |
| Gemini CLI | Google 开源 AI Coding CLI |
| Aider | 开源 AI pair programming CLI |
| OpenCode | 新一代开源 AI Coding CLI |

### 命令类型

| 类型 | 说明 | 示例 |
|---|---|---|
| Command Options | CLI 启动参数和标志 | `--model`、`--sandbox`、`--dangerously-skip-permissions` |
| Slash Commands | 对话中的斜杠命令 | `/compact`、`/help`、`/clear` |
| Subcommands | 工具的子命令 | `mcp`、`config`、`resume` |

### 命令分类

`Model` · `Session` · `Permission` · `Config` · `MCP` · `Slash Commands`

### 风险等级

| 等级 | 含义 |
|---|---|
| **Low** | 无副作用，可放心使用 |
| **Medium** | 影响工具行为，使用前需了解 |
| **High** | 可能造成不可逆操作或安全风险，需谨慎使用 |

### 来源标注

| 来源 | 含义 |
|---|---|
| **Official** | 来自官方文档，权威可信 |
| **GitHub** | 来自 GitHub README / issue / release notes |
| **Community** | 来自社区整理，可能存在时效问题 |

---

## 产品形态

- **网站类型**：纯静态展示型网站，无需注册登录
- **主要终端**：桌面端优先，兼容移动端
- **设计风格**：开发者文档风格——深色背景、等宽字体、紧凑表格、无装饰性图形
- **核心界面**：搜索框、命令表格、命令详情卡片、横向对比表格

---

## 页面结构

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `/` | 搜索入口 + 工具筛选 + 分类导航 + 最近更新 |
| 工具详情页 | `/tools/:tool` | 某款 CLI 的全部命令列表 |
| 命令详情页 | `/commands/:tool/:command` | 单条命令的完整参考信息 |
| 对比页 | `/compare` | 多工具能力横向对比 |

---

## MVP 范围说明

**包含**

- 5 款主流 AI CLI 工具的核心命令收录
- 全文搜索（客户端）
- 工具详情页、命令详情页、对比页
- 风险等级和来源标注
- 命令语法和示例的复制功能

**暂不包含**

- 用户账号与登录
- 社区提交界面（MVP 阶段通过 GitHub Issues 接受贡献）
- 命令变更历史记录
- 深色/浅色模式切换（MVP 仅深色模式）
- 移动端 App

---

## 贡献与数据维护

ai-command-atlas 的内容维护遵循以下原则：

1. **官方来源优先**：命令信息以官方文档和 GitHub 仓库为权威来源
2. **版本标注**：每条命令记录「Last checked」日期，方便用户判断时效性
3. **社区贡献**：通过 GitHub 接受命令补充和纠错，内容审核后合并

---

*ai-command-atlas · 让 AI CLI 命令查询像查字典一样简单*
