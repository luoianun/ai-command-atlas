SET NAMES utf8mb4;
USE ai_command_atlas;

-- Tools (manually maintained — rarely changes)
INSERT INTO tools (slug, name, company, description, description_zh, color, avatar, version, source_type, github_url, docs_url) VALUES
('claude-code', 'Claude Code', 'Anthropic', 'Anthropic''s agentic coding CLI. Deep IDE integration, rich slash commands, MCP tool protocol, granular permission controls, and context-compaction for long sessions.', 'Anthropic 的 AI 编码 CLI。深度 IDE 集成、丰富的斜杠命令、MCP 工具协议、细粒度权限控制以及长会话上下文压缩。', '#d97706', 'CC', 'v1.x', 'official', 'https://github.com/anthropics/claude-code', 'https://docs.anthropic.com/en/docs/claude-code'),
('codex-cli', 'Codex CLI', 'OpenAI', 'OpenAI''s lightweight terminal coding agent. Configurable approval modes (suggest / auto-edit / full-auto), sandboxed execution, and support for multiple model providers.', 'OpenAI 的轻量级终端编码代理。可配置的批准模式（suggest / auto-edit / full-auto）、沙盒执行以及多模型提供商支持。', '#16a34a', 'CX', 'v0.1.x', 'official', 'https://github.com/openai/codex', 'https://developers.openai.com/codex/cli'),
('gemini-cli', 'Gemini CLI', 'Google', 'Google''s open-source AI agent for the terminal, powered by Gemini models. Supports file operations, web search, image understanding, and tool-use extensions.', 'Google 开源的终端 AI 代理，由 Gemini 模型驱动。支持文件操作、网页搜索、图像理解和工具扩展。', '#2563eb', 'GC', 'v0.1.x', 'official', 'https://github.com/google-gemini/gemini-cli', 'https://geminicli.com/docs/reference/commands/'),
('aider', 'Aider', 'Independent', 'AI pair programmer in your terminal. Git-native with automatic commit messages, multi-file edits, and broad model support (OpenAI, Anthropic, local models via Ollama).', '终端中的 AI 结对编程工具。原生 Git 集成，自动提交信息、多文件编辑，并广泛支持各类模型（OpenAI、Anthropic、通过 Ollama 使用的本地模型）。', '#7c3aed', 'AI', 'v0.71.x', 'official', 'https://github.com/Aider-AI/aider', 'https://aider.chat/docs'),
('opencode', 'OpenCode', 'Independent', 'Terminal-based AI coding agent from SST with a full TUI interface. Supports multiple providers, persistent sessions, file operations, and shell command execution.', '来自 SST 的终端 AI 编码代理，配备完整的 TUI 界面。支持多提供商、持久会话、文件操作和 shell 命令执行。', '#0891b2', 'OC', 'v0.1.x', 'official', 'https://github.com/anomalyco/opencode', 'https://opencode.ai/docs/cli/');

-- Claude Code commands (base fields — enriched data loaded from scraped-data.sql)
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

-- Codex CLI commands
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

-- Gemini CLI commands
SET @gc = (SELECT id FROM tools WHERE slug = 'gemini-cli');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@gc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Select the Gemini model variant (e.g. gemini-2.5-pro).', '--model <model-id>', '<model-id>', '2026-05-28'),
(@gc, 'compress', '/compress', 'slash', 'Session', 'low', 'official', 'Compress conversation history to free up context window.', '/compress', NULL, '2026-05-28'),
(@gc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28'),
(@gc, 'help', '/help', 'slash', 'Session', 'low', 'official', 'Display available commands and usage information.', '/help', NULL, '2026-05-28'),
(@gc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit Gemini CLI configuration stored in ~/.gemini/config.yaml.', 'gemini config', NULL, '2026-05-28'),
(@gc, 'gemini-md', 'GEMINI.md', 'config', 'Config', 'low', 'official', 'Custom instructions file loaded from project root, injected into every session.', 'GEMINI.md', NULL, '2026-05-28');

-- Aider commands
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

-- OpenCode commands
SET @oc = (SELECT id FROM tools WHERE slug = 'opencode');

INSERT INTO commands (tool_id, slug, name, command_type, category, risk_level, source, description, syntax, value_hint, last_checked) VALUES
(@oc, 'model', '--model', 'option', 'Model', 'low', 'official', 'Specify via provider/model format (e.g. anthropic/claude-opus-4-5).', '--model <provider/model>', NULL, '2026-05-28'),
(@oc, 'provider', '--provider', 'option', 'Model', 'low', 'official', 'Select AI provider: anthropic, openai, groq, ollama.', '--provider <provider>', NULL, '2026-05-28'),
(@oc, 'mcp', 'mcp', 'subcommand', 'MCP', 'medium', 'official', 'Native MCP support — add, remove, list tool servers.', 'opencode mcp <add|remove|list>', NULL, '2026-05-28'),
(@oc, 'mcp-add', 'mcp add', 'subcommand', 'MCP', 'medium', 'official', 'Register a new MCP tool server.', 'opencode mcp add', NULL, '2026-05-28'),
(@oc, 'config', 'config', 'subcommand', 'Config', 'low', 'official', 'View or edit configuration with get/set/list subcommands.', 'opencode config [get|set|list]', NULL, '2026-05-28'),
(@oc, 'clear', '/clear', 'slash', 'Session', 'low', 'official', 'Clear the current conversation history.', '/clear', NULL, '2026-05-28');

-- Compare capabilities (base — zh fields enriched in scraped-data.sql)
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

-- Compare entries (base — zh fields enriched in scraped-data.sql)
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
(@cap_model1,@cc,1,'--model','model','e.g. claude-opus-4-5',NULL,'low','official','--model claude-opus-4-5'),
(@cap_model1,@cx,1,'--model','model','e.g. o4-mini, gpt-4o',NULL,'low','official','--model o4-mini'),
(@cap_model1,@gc,1,'--model','model','e.g. gemini-2.5-pro',NULL,'low','official','--model gemini-2.5-pro'),
(@cap_model1,@ai,1,'--model','model','e.g. gpt-4o, claude-3-5-sonnet',NULL,'low','official','--model claude-3-5-sonnet-20241022'),
(@cap_model1,@oc,1,'--model','model','Specify via provider/model format',NULL,'low','official','--model anthropic/claude-opus-4-5'),
(@cap_model2,@cc,0,NULL,NULL,NULL,'Not applicable',NULL,NULL,NULL),
(@cap_model2,@cx,1,'--provider','provider','openai, azure, ollama, anthropic',NULL,'low','official','--provider ollama'),
(@cap_model2,@gc,0,NULL,NULL,NULL,'Google-only',NULL,NULL,NULL),
(@cap_model2,@ai,0,NULL,NULL,NULL,'Uses model ID prefix',NULL,NULL,NULL),
(@cap_model2,@oc,1,'--provider','provider','anthropic, openai, groq, ollama',NULL,'low','official','--provider groq'),
(@cap_model3,@cc,0,NULL,NULL,NULL,'Via settings.json',NULL,NULL,NULL),
(@cap_model3,@cx,1,'--temperature','temperature','Float 0.0–2.0',NULL,'low','github','--temperature 0.2'),
(@cap_model3,@gc,0,NULL,NULL,NULL,'Not exposed',NULL,NULL,NULL),
(@cap_model3,@ai,1,'--temperature','temperature','Float, model-specific range',NULL,'low','official','--temperature 0'),
(@cap_model3,@oc,0,NULL,NULL,NULL,'Via config file',NULL,NULL,NULL),
(@cap_sess1,@cc,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@cx,1,'/compact','compact','Supports custom instructions',NULL,'low','official','/compact'),
(@cap_sess1,@gc,1,'/compress','compress','Compresses history automatically',NULL,'low','official','/compress'),
(@cap_sess1,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess1,@oc,0,NULL,NULL,NULL,'Planned',NULL,NULL,NULL),
(@cap_sess2,@cc,1,'resume','resume','Subcommand, pass session ID',NULL,'low','official','claude resume'),
(@cap_sess2,@cx,1,'resume','resume','Interactive picker if no ID given',NULL,'low','official','codex resume'),
(@cap_sess2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess2,@ai,0,NULL,NULL,NULL,'No persistent sessions',NULL,NULL,NULL),
(@cap_sess2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_sess3,@cc,1,'/clear','clear','Alias: /reset',NULL,'low','official','/clear'),
(@cap_sess3,@cx,1,'/clear','clear','Wipes current session',NULL,'low','official','/clear'),
(@cap_sess3,@gc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
(@cap_sess3,@ai,1,'/drop','drop','Drops all files from context',NULL,'low','official','/drop'),
(@cap_sess3,@oc,1,'/clear','clear',NULL,NULL,'low','official','/clear'),
(@cap_perm1,@cc,1,'--dangerously-skip-permissions','dangerously-skip-permissions','Full bypass, all tools',NULL,'high','official','--dangerously-skip-permissions'),
(@cap_perm1,@cx,1,'--dangerously-auto-approve-everything','dangerously-auto-approve-everything','Auto-approves all actions',NULL,'high','official','--dangerously-auto-approve-everything'),
(@cap_perm1,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm1,@ai,1,'--yes','yes','Auto-confirm all prompts',NULL,'high','official','--yes'),
(@cap_perm1,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@cc,0,NULL,NULL,NULL,'Uses OS-level containers',NULL,NULL,NULL),
(@cap_perm2,@cx,1,'--sandbox','sandbox','macOS Sandbox / Docker',NULL,'low','github','--sandbox'),
(@cap_perm2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm2,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm3,@cc,1,'--permission-mode','permission-mode','default, acceptEdits, bypassPermissions',NULL,'medium','official','--permission-mode acceptEdits'),
(@cap_perm3,@cx,1,'--approval-mode','approval-mode','suggest, auto-edit, full-auto',NULL,'medium','official','--approval-mode auto-edit'),
(@cap_perm3,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_perm3,@ai,0,NULL,NULL,NULL,'Per-action prompts only',NULL,NULL,NULL),
(@cap_perm3,@oc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp1,@cc,1,'mcp','mcp','Native — add, remove, list, run servers',NULL,'medium','official','claude mcp add'),
(@cap_mcp1,@cx,0,NULL,NULL,NULL,'Not yet implemented',NULL,NULL,NULL),
(@cap_mcp1,@gc,0,NULL,NULL,NULL,'Planned (Google extensions)',NULL,NULL,NULL),
(@cap_mcp1,@ai,0,NULL,NULL,NULL,'Not supported',NULL,NULL,NULL),
(@cap_mcp1,@oc,1,'mcp','mcp','Native MCP support via config',NULL,'medium','official','opencode mcp add'),
(@cap_mcp2,@cc,1,'mcp add','mcp-add','Supports stdio, sse, http',NULL,'medium','official','claude mcp add --transport stdio my-server'),
(@cap_mcp2,@cx,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@gc,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@ai,0,NULL,NULL,NULL,'Not available',NULL,NULL,NULL),
(@cap_mcp2,@oc,1,'mcp add','mcp-add',NULL,NULL,'medium','official','opencode mcp add'),
(@cap_cfg1,@cc,1,'config','config','JSON settings at ~/.claude/settings.json',NULL,'low','official','claude config'),
(@cap_cfg1,@cx,1,'config','config','Interactive editor + get/set subcommands',NULL,'low','official','codex config set model o4-mini'),
(@cap_cfg1,@gc,1,'config','config','YAML config at ~/.gemini/config.yaml',NULL,'low','official','gemini config'),
(@cap_cfg1,@ai,0,NULL,NULL,NULL,'Via .aider.conf.yml',NULL,NULL,NULL),
(@cap_cfg1,@oc,1,'config','config','JSON config with get/set/list',NULL,'low','official','opencode config list'),
(@cap_cfg2,@cc,1,'CLAUDE.md','claude-md','Checked in project root or home dir',NULL,'low','official','CLAUDE.md'),
(@cap_cfg2,@cx,1,'AGENTS.md','agents-md','Agent instructions, project-level',NULL,'low','official','AGENTS.md'),
(@cap_cfg2,@gc,1,'GEMINI.md','gemini-md','Loaded from project root',NULL,'low','official','GEMINI.md'),
(@cap_cfg2,@ai,1,'.aider.system.md','system-md','Custom system prompt file',NULL,'low','official','.aider.system.md'),
(@cap_cfg2,@oc,0,NULL,NULL,NULL,'Via config instructions key',NULL,NULL,NULL);
